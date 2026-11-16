import {
  trialCatalog,
  MIN_INTERVAL,
  isSourceUrl,
  type FeedSource,
} from "./catalog";
import { FeedError, parseFeed } from "./parser";
import { classifyArticle } from "./classify";
import { digest } from "../auth";

interface SourceState {
  id: string;
  etag: string | null;
  last_modified: string | null;
  reading_metadata_version?: number;
}
const MAX_BYTES = 1_000_000;
export async function fetchFeed(
  source: FeedSource,
  state: SourceState,
  fetcher: typeof fetch = fetch,
) {
  if (!source.feed) throw new FeedError("unavailable");
  let url: string = source.feed;
  const signal = AbortSignal.timeout(12_000);
  let response: Response | undefined;
  for (let hop = 0; hop <= 3; hop++) {
    if (!isSourceUrl(url, source)) throw new FeedError("redirect_refused");
    response = await fetcher(url, {
      redirect: "manual",
      signal,
      headers: {
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.2",
        "User-Agent":
          "MyPressReview/0.1 (+https://github.com/laurentkai/my-press-review)",
        ...(state.reading_metadata_version !== 0 && state.etag
          ? { "If-None-Match": state.etag }
          : {}),
        ...(state.reading_metadata_version !== 0 && state.last_modified
          ? { "If-Modified-Since": state.last_modified }
          : {}),
      },
    });
    if (
      response.status < 300 ||
      response.status >= 400 ||
      response.status === 304
    )
      break;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new FeedError("redirect_refused");
    const target = new URL(location, url);
    if (target.hostname === "myprivacy.dpgmedia.be")
      throw new FeedError("consent_required");
    if (hop === 3 || !isSourceUrl(target.href, source))
      throw new FeedError("redirect_refused");
    url = target.href;
  }
  if (!response) throw new FeedError("network_error");
  if (response.status === 304) {
    await response.body?.cancel();
    return {
      status: "not_modified",
      items: [],
      etag: state.etag,
      modified: state.last_modified,
    };
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new FeedError(
      response.status === 403
        ? "blocked_403"
        : response.status === 429
          ? "rate_limited"
          : response.status === 404
            ? "not_found"
            : "server_error",
    );
  }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel();
    throw new FeedError("too_large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new FeedError("invalid_xml");
  let size = 0;
  const decoder = new TextDecoder();
  let xml = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new FeedError("too_large");
      }
      xml += decoder.decode(value, { stream: true });
    }
    xml += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  const items = parseFeed(xml, source).slice(0, 30);
  return {
    status: items.length ? "ok" : "empty",
    items,
    etag: response.headers.get("etag")?.slice(0, 512) ?? null,
    modified: response.headers.get("last-modified")?.slice(0, 128) ?? null,
  };
}

export async function collectSource(
  db: D1Database,
  id: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  const source = trialCatalog.find((entry) => entry.id === id);
  if (!source?.feed) return { processed: false, status: "unavailable" };
  const owner = crypto.randomUUID();
  const state = await db
    .prepare(
      "UPDATE trial_sources SET lease_owner=?, lease_until=?, last_attempt_at=? WHERE id=? AND enabled=1 AND next_fetch_at<=? AND lease_until<=? RETURNING id, etag, last_modified, reading_metadata_version",
    )
    .bind(owner, now + 120_000, now, id, now, now)
    .first<SourceState>();
  if (!state) return { processed: false, status: "not_due" };
  try {
    const result = await fetchFeed(source, state, fetcher);
    const collected = new Date(now).toISOString();
    const writes: D1PreparedStatement[] = [];
    for (const item of result.items) {
      const articleId = await digest(id + "\n" + item.url);
      const topic = classifyArticle(item, id);
      // Every write is conditional on the still-valid lease and source activation.
      writes.push(
        db
          .prepare(
            `INSERT INTO trial_articles(id,source_id,url,title,excerpt,published_at,collected_at,body_text,image_url,image_credit,access_level,publisher_categories,theme,subtheme)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND lease_owner=? AND lease_until>?)
        ON CONFLICT(source_id,url) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,published_at=COALESCE(excluded.published_at,trial_articles.published_at),collected_at=excluded.collected_at,body_text=excluded.body_text,image_url=excluded.image_url,image_credit=excluded.image_credit,access_level=excluded.access_level,publisher_categories=excluded.publisher_categories,theme=excluded.theme,subtheme=excluded.subtheme`,
          )
          .bind(
            articleId,
            id,
            item.url,
            item.title,
            item.excerpt,
            item.publishedAt,
            collected,
            item.bodyText,
            item.imageUrl,
            item.imageCredit,
            item.accessLevel,
            JSON.stringify(item.categories),
            topic.theme,
            topic.subtheme,
            id,
            owner,
            Date.now(),
          ),
      );
    }
    writes.push(
      db
        .prepare(
          "DELETE FROM trial_articles WHERE source_id=? AND (collected_at<? OR id NOT IN (SELECT id FROM trial_articles WHERE source_id=? ORDER BY collected_at DESC LIMIT 200))",
        )
        .bind(id, new Date(now - 14 * 86_400_000).toISOString(), id),
    );
    writes.push(
      db
        .prepare(
          "UPDATE trial_sources SET status=?,last_success_at=?,next_fetch_at=?,etag=?,last_modified=?,last_item_count=?,reading_metadata_version=1,lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=? AND enabled=1",
        )
        .bind(
          result.status,
          now,
          now + MIN_INTERVAL,
          result.etag,
          result.modified,
          result.items.length,
          id,
          owner,
        ),
    );
    // Pausing during a request must release the lease too, without accepting
    // its result or touching a lease acquired by a later collector.
    writes.push(
      db
        .prepare(
          "UPDATE trial_sources SET lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=?",
        )
        .bind(id, owner),
    );
    await db.batch(writes);
    return {
      processed: true,
      status: result.status,
      count: result.items.length,
    };
  } catch (error) {
    const status =
      error instanceof FeedError
        ? error.status
        : error instanceof Error &&
            ["TimeoutError", "AbortError"].includes(error.name)
          ? "timeout"
          : "network_error";
    const interval = ["blocked_403", "consent_required", "not_found"].includes(
      status,
    )
      ? 6 * 60 * 60_000
      : status === "rate_limited"
        ? 60 * 60_000
        : MIN_INTERVAL;
    await db
      .prepare(
        "UPDATE trial_sources SET status=?,next_fetch_at=?,lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=?",
      )
      .bind(status, now + interval, id, owner)
      .run();
    return { processed: true, status, count: 0 };
  }
}
export async function scheduledCollection(db: D1Database, now = Date.now()) {
  // One source per invocation keeps each collection within Workers query/CPU limits.
  const state = await db
    .prepare(
      "SELECT id FROM trial_sources WHERE enabled=1 AND next_fetch_at<=? AND lease_until<=? ORDER BY next_fetch_at,id LIMIT 1",
    )
    .bind(now, now)
    .first<{ id: string }>();
  if (state) await collectSource(db, state.id);
  await db.batch([
    db.prepare("DELETE FROM trial_sessions WHERE expires_at<=?").bind(now),
    db.prepare("DELETE FROM trial_login_limits WHERE expires_at<=?").bind(now),
  ]);
}
