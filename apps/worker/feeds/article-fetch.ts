import robotsParser from "robots-parser";
import { isSourceUrl, type FeedSource } from "./catalog";
import { preprocessArticleHtml } from "./article-preprocess";
import { extractArticle } from "./article-extractor";

const USER_AGENT =
  "MyPressReview/0.1 (+https://github.com/laurentkai/my-press-review)";
export class ArticleFetchError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}
async function readBounded(
  response: Response,
  max: number,
  signal: AbortSignal,
) {
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new ArticleFetchError("too_large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ArticleFetchError("empty_response");
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    signal.throwIfAborted();
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new ArticleFetchError("too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
async function documentResponse(
  url: string,
  source: FeedSource,
  fetcher: typeof fetch,
  signal: AbortSignal,
  allowed?: (url: string) => boolean,
) {
  for (let hop = 0; hop <= 3; hop++) {
    if (!isSourceUrl(url, source))
      throw new ArticleFetchError("redirect_refused");
    if (allowed && !allowed(url))
      throw new ArticleFetchError("robots_disallowed");
    const response = await fetcher(url, {
      redirect: "manual",
      signal,
      credentials: "omit",
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.5",
        "Cache-Control": "no-cache",
      },
    });
    if (response.status < 300 || response.status >= 400)
      return { response, url };
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new ArticleFetchError("redirect_refused");
    const target = new URL(location, url);
    if (
      /(?:consent|privacy)/i.test(target.hostname) &&
      !isSourceUrl(target.href, source)
    )
      throw new ArticleFetchError("consent_required");
    if (hop === 3 || !isSourceUrl(target.href, source))
      throw new ArticleFetchError("redirect_refused");
    url = target.href;
  }
  throw new ArticleFetchError("redirect_refused");
}
export async function fetchArticlePage(
  db: D1Database,
  url: string,
  source: FeedSource,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  if (!isSourceUrl(url, source)) throw new ArticleFetchError("url_refused");
  const signal = AbortSignal.timeout(15_000);
  const origin = new URL(url).origin;
  let robots = await db
    .prepare(
      "SELECT body,status FROM trial_article_robots WHERE origin=? AND next_check_at>?",
    )
    .bind(origin, now)
    .first<{ body: string; status: string }>();
  if (!robots) {
    let body = "",
      status = "ok";
    try {
      const { response } = await documentResponse(
        origin + "/robots.txt",
        source,
        fetcher,
        signal,
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new ArticleFetchError("robots_unavailable");
      }
      body = await readBounded(response, 128_000, signal);
      if (body.trim().startsWith("<"))
        throw new ArticleFetchError("robots_unavailable");
    } catch {
      status = "robots_unavailable";
      body = "";
    }
    await db
      .prepare(
        "INSERT INTO trial_article_robots(origin,body,status,next_check_at) VALUES(?,?,?,?) ON CONFLICT(origin) DO UPDATE SET body=excluded.body,status=excluded.status,next_check_at=excluded.next_check_at",
      )
      .bind(origin, body, status, now + (status === "ok" ? 3_600_000 : 900_000))
      .run();
    robots = { body, status };
  }
  if (robots.status !== "ok") throw new ArticleFetchError("robots_unavailable");
  const rules = robotsParser(origin + "/robots.txt", robots.body);
  if (rules.isAllowed(url, "MyPressReview") !== true)
    throw new ArticleFetchError("robots_disallowed");
  const delay = rules.getCrawlDelay("MyPressReview") ?? 0;
  if (!Number.isFinite(delay) || delay < 0 || delay > 86_400)
    throw new ArticleFetchError("robots_disallowed");
  const { response } = await documentResponse(
    url,
    source,
    fetcher,
    signal,
    (target) => rules.isAllowed(target, "MyPressReview") === true,
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new ArticleFetchError(
      response.status === 403
        ? "blocked_403"
        : response.status === 429
          ? "rate_limited"
          : response.status === 404
            ? "not_found"
            : "server_error",
    );
  }
  if (
    !/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  ) {
    await response.body?.cancel();
    throw new ArticleFetchError("unsupported_content");
  }
  const robotTags = response.headers.get("x-robots-tag") ?? "";
  if (/(?:nosnippet|max-snippet\s*:\s*0)(?:\b|$)/i.test(robotTags)) {
    await response.body?.cancel();
    throw new ArticleFetchError("publisher_policy");
  }
  const html = await readBounded(response, 2_000_000, signal);
  const result = extractArticle(await preprocessArticleHtml(html), source.id);
  return {
    ...result,
    cacheable:
      !("cacheable" in result && result.cacheable === false) &&
      !/(?:^|[\s,:])noarchive\b/i.test(robotTags),
    crawlDelayMs: Math.max(15_000, delay * 1000),
  };
}
