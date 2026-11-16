import type { Context } from "hono";
import { limitedBody } from "./body";
import type { Bindings } from "./index";
import { trialCatalog } from "./feeds/catalog";
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
export async function workspace(c: Context<{ Bindings: Bindings }>) {
  const states = await c.env.DB.prepare(
    "SELECT s.*, (SELECT COUNT(*) FROM trial_articles a WHERE a.source_id=s.id) AS article_count FROM trial_sources s",
  ).all<State>();
  const rows = await c.env.DB.prepare(
    `SELECT * FROM (SELECT a.*, ROW_NUMBER() OVER(PARTITION BY source_id ORDER BY COALESCE(published_at,collected_at) DESC,a.id) AS position FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1) WHERE position<=20 ORDER BY COALESCE(published_at,collected_at) DESC,id`,
  ).all<{
    id: string;
    source_id: string;
    url: string;
    title: string;
    excerpt: string;
    published_at: string | null;
    collected_at: string;
  }>();
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
    articles: rows.results.map((item) => ({
      id: item.id,
      sourceId: item.source_id,
      url: item.url,
      title: item.title,
      excerpt: item.excerpt,
      publishedAt: item.published_at,
      collectedAt: item.collected_at,
    })),
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
