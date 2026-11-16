import { trialCatalog } from "./catalog";
import { fetchArticlePage, ArticleFetchError } from "./article-fetch";

export type FullTextStatus =
  "pending" | "available" | "live" | "restricted" | "unavailable";
const TRANSIENT_REASONS = [
  "network_error",
  "timeout",
  "server_error",
  "robots_unavailable",
  "rate_limited",
];
interface ArticleJob {
  id: string;
  source_id: string;
  url: string;
  access_level: string;
  full_status: FullTextStatus;
  full_next_fetch_at: number;
  full_reason: string;
}
export function articlePolicy(sourceId: string, access: string): string | null {
  if (access === "restricted") return "access_restricted";
  if (sourceId === "7sur7") return "publisher_policy";
  if (!["dh", "lalibre", "gouvernement"].includes(sourceId))
    return "source_unverified";
  if (["dh", "lalibre"].includes(sourceId) && access !== "free")
    return "access_unverified";
  return null;
}
export async function collectArticle(
  db: D1Database,
  id: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  const article = await db
    .prepare(
      "SELECT a.id,a.source_id,a.url,a.access_level,a.full_status,a.full_next_fetch_at,a.full_reason FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE a.id=? AND s.enabled=1",
    )
    .bind(id)
    .first<ArticleJob>();
  if (!article)
    return {
      processed: false,
      status: "missing",
      reason: "not_found",
      nextAttemptAt: 0,
    };
  const policy = articlePolicy(article.source_id, article.access_level);
  if (policy) {
    const status =
      policy === "access_restricted" ? "restricted" : "unavailable";
    await db
      .prepare(
        "UPDATE trial_articles SET full_status=?,full_reason=?,full_text='',full_next_fetch_at=? WHERE id=?",
      )
      .bind(status, policy, now + 86_400_000, id)
      .run();
    return {
      processed: false,
      status,
      reason: policy,
      nextAttemptAt: now + 86_400_000,
    };
  }
  if (
    article.full_status === "available" ||
    article.full_status === "restricted" ||
    (article.full_status === "unavailable" &&
      !TRANSIENT_REASONS.includes(article.full_reason))
  )
    return {
      processed: false,
      status: article.full_status,
      reason: article.full_reason,
      nextAttemptAt: article.full_next_fetch_at,
    };
  if (article.full_next_fetch_at > now)
    return {
      processed: false,
      status: article.full_status,
      reason: "not_due",
      nextAttemptAt: article.full_next_fetch_at,
    };
  const source = trialCatalog.find(
    (source) => source.id === article.source_id,
  )!;
  const owner = crypto.randomUUID();
  const lease = await db
    .prepare(
      "UPDATE trial_sources SET article_lease_owner=?,article_lease_until=? WHERE id=? AND enabled=1 AND article_lease_until<=? AND article_next_fetch_at<=? AND lease_until<=? RETURNING id",
    )
    .bind(owner, now + 90_000, source.id, now, now, now)
    .first();
  if (!lease) {
    const state = await db
      .prepare(
        "SELECT article_next_fetch_at,article_lease_until,lease_until FROM trial_sources WHERE id=?",
      )
      .bind(source.id)
      .first<{
        article_next_fetch_at: number;
        article_lease_until: number;
        lease_until: number;
      }>();
    return {
      processed: false,
      status: article.full_status,
      reason: "source_busy",
      nextAttemptAt: Math.max(
        state?.article_next_fetch_at ?? 0,
        state?.article_lease_until ?? 0,
        state?.lease_until ?? 0,
      ),
    };
  }
  let delay = 15_000;
  try {
    let status: FullTextStatus = "unavailable",
      text = "",
      reason = "network_error",
      cacheable = true;
    try {
      const result = await fetchArticlePage(
        db,
        article.url,
        source,
        fetcher,
        now,
      );
      status = result.status;
      text = result.text;
      reason = result.reason;
      cacheable = result.cacheable;
      delay = result.crawlDelayMs;
      if (status === "available" && !cacheable) status = "live";
    } catch (error) {
      reason =
        error instanceof ArticleFetchError
          ? error.reason
          : error instanceof Error &&
              ["AbortError", "TimeoutError"].includes(error.name)
            ? "timeout"
            : "network_error";
    }
    if (
      ["blocked_403", "robots_disallowed", "publisher_policy"].includes(reason)
    )
      delay = Math.max(delay, 6 * 3_600_000);
    else if (reason === "rate_limited") delay = Math.max(delay, 3_600_000);
    else if (reason === "robots_unavailable") delay = Math.max(delay, 900_000);
    const completedAt = Date.now();
    const nextAttempt =
      completedAt +
      (status === "available"
        ? 86_400_000
        : status === "live"
          ? delay
          : ["restricted", "unavailable"].includes(status)
            ? TRANSIENT_REASONS.includes(reason)
              ? Math.max(900_000, delay)
              : 86_400_000
            : 900_000);
    const accepted = await db
      .prepare(
        `UPDATE trial_articles SET full_status=?,full_text=?,full_reason=?,full_fetched_at=?,full_next_fetch_at=? WHERE id=? AND access_level!='restricted' AND EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND article_lease_owner=? AND article_lease_until>?) RETURNING id`,
      )
      .bind(
        status,
        status === "available" ? text : "",
        reason,
        completedAt,
        nextAttempt,
        id,
        source.id,
        owner,
        Date.now(),
      )
      .first();
    if (!accepted)
      return {
        processed: false,
        status: "unavailable",
        reason: "source_changed",
        nextAttemptAt: Date.now() + delay,
      };
    return {
      processed: true,
      status,
      reason,
      nextAttemptAt: nextAttempt,
      ...(status === "live" ? { liveText: text } : {}),
    };
  } finally {
    await db
      .prepare(
        "UPDATE trial_sources SET article_lease_owner=NULL,article_lease_until=0,article_next_fetch_at=? WHERE id=? AND article_lease_owner=?",
      )
      .bind(Date.now() + delay, source.id, owner)
      .run();
  }
}
// IPM noarchive bodies are fetched on demand; only verified cacheable public
// government articles run in the background. Terminal results never recur.
export async function scheduledArticles(db: D1Database, now = Date.now()) {
  const due = await db
    .prepare(
      `SELECT a.id FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1 AND a.source_id='gouvernement' AND a.access_level!='restricted' AND (a.full_status='pending' OR (a.full_status='unavailable' AND a.full_reason IN (${TRANSIENT_REASONS.map(() => "?").join(",")}))) AND a.full_next_fetch_at<=? AND s.article_next_fetch_at<=? AND s.article_lease_until<=? AND s.lease_until<=? ORDER BY COALESCE(a.published_at,a.collected_at) DESC LIMIT 1`,
    )
    .bind(...TRANSIENT_REASONS, now, now, now, now)
    .all<{ id: string }>();
  return Promise.allSettled(
    due.results.map((article) => collectArticle(db, article.id, fetch, now)),
  );
}
