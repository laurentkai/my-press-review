import type { Context } from "hono";
import { limitedBody } from "./body";
import type { Bindings } from "./index";
import { trialCatalog } from "./feeds/catalog";
import { classifyArticle } from "./feeds/classify";
import { collectArticle, articlePolicy } from "./feeds/article-collector";
import type { FullTextStatus } from "../../packages/shared/types";
import { collectSource } from "./feeds/collector";

interface State {
  id: string;
  enabled: number;
  status: string;
  last_attempt_at: number | null;
  last_success_at: number | null;
  next_fetch_at: number;
  article_count: number;
}
interface ArticleRow {
  id: string;
  source_id: string;
  url: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  collected_at: string;
  image_url: string | null;
  image_credit: string;
  access_level: "free" | "restricted" | "unknown";
  publisher_categories: string;
  theme: string | null;
  subtheme: string | null;
  body_text?: string;
  full_text?: string;
  full_status: FullTextStatus;
  full_reason: string;
  full_fetched_at: number | null;
  full_next_fetch_at: number;
}
function articleResponse(item: ArticleRow) {
  const categories = JSON.parse(item.publisher_categories) as string[];
  const topic = item.theme
    ? { theme: item.theme, subtheme: item.subtheme }
    : classifyArticle({ ...item, categories }, item.source_id);
  return {
    id: item.id,
    sourceId: item.source_id,
    url: item.url,
    title: item.title,
    excerpt: item.excerpt,
    publishedAt: item.published_at,
    collectedAt: item.collected_at,
    imageUrl: item.image_url,
    imageCredit: item.image_credit,
    accessLevel:
      item.full_status === "restricted" ? "restricted" : item.access_level,
    publisherCategories: categories,
    fullTextStatus:
      item.access_level === "restricted" ? "restricted" : item.full_status,
    ...topic,
  };
}
export async function readArticle(c: Context<{ Bindings: Bindings }>) {
  const row = await c.env.DB.prepare(
    "SELECT a.* FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE a.id=? AND s.enabled=1",
  )
    .bind(c.req.param("id"))
    .first<ArticleRow>();
  if (!row) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json({
    ...articleResponse(row),
    bodyText:
      row.access_level === "restricted" || row.full_status === "restricted"
        ? ""
        : row.full_status === "available"
          ? (row.full_text ?? "")
          : (row.body_text ?? ""),
    contentKind:
      row.full_status === "available" && row.access_level !== "restricted"
        ? "article"
        : "feed",
    fullTextReason:
      row.full_reason || articlePolicy(row.source_id, row.access_level) || "",
    fullTextFetchedAt: row.full_fetched_at,
    fullTextNextAttemptAt: row.full_next_fetch_at,
  });
}
export async function workspace(c: Context<{ Bindings: Bindings }>) {
  const states = await c.env.DB.prepare(
    "SELECT s.*, (SELECT COUNT(*) FROM trial_articles a WHERE a.source_id=s.id) AS article_count FROM trial_sources s",
  ).all<State>();
  const rows = await c.env.DB.prepare(
    `SELECT * FROM (SELECT a.id,a.source_id,a.url,a.title,a.excerpt,a.published_at,a.collected_at,a.image_url,a.image_credit,a.access_level,a.publisher_categories,a.theme,a.subtheme,a.full_status,a.full_reason,a.full_fetched_at,a.full_next_fetch_at, ROW_NUMBER() OVER(PARTITION BY source_id ORDER BY COALESCE(published_at,collected_at) DESC,a.id) AS position FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1) WHERE position<=20 ORDER BY COALESCE(published_at,collected_at) DESC,id`,
  ).all<ArticleRow>();
  return c.json({
    sources: trialCatalog.map((source) => {
      const state = states.results.find((entry) => entry.id === source.id);
      return {
        ...source,
        enabled: !!state?.enabled,
        status: state?.status ?? "pending",
        lastAttemptAt: state?.last_attempt_at ?? null,
        lastSuccessAt: state?.last_success_at ?? null,
        nextFetchAt: state?.next_fetch_at ?? 0,
        articleCount: state?.article_count ?? 0,
      };
    }),
    articles: rows.results.map(articleResponse),
  });
}
export async function toggleSource(c: Context<{ Bindings: Bindings }>) {
  const source = trialCatalog.find((entry) => entry.id === c.req.param("id"));
  if (!source) return c.json({ error: "NOT_FOUND" }, 404);
  let enabled: unknown;
  try {
    const raw = await limitedBody(c.req.raw, 128);
    enabled = JSON.parse(raw).enabled;
  } catch {
    return c.json({ error: "INVALID_REQUEST" }, 400);
  }
  if (typeof enabled !== "boolean" || (enabled && !source.feed))
    return c.json({ error: "SOURCE_UNAVAILABLE" }, 400);
  await c.env.DB.prepare("UPDATE trial_sources SET enabled=? WHERE id=?")
    .bind(enabled ? 1 : 0, source.id)
    .run();
  return c.json({ enabled });
}
export async function refreshSource(c: Context<{ Bindings: Bindings }>) {
  if (!trialCatalog.some((entry) => entry.id === c.req.param("id")))
    return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(await collectSource(c.env.DB, c.req.param("id")!));
}

export async function retrieveArticle(c: Context<{ Bindings: Bindings }>) {
  const result = await collectArticle(c.env.DB, c.req.param("id")!);
  if (result.status === "missing") return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(result);
}
