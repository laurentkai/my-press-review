// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryD1 } from "./d1";
import { fetchArticlePage } from "../apps/worker/feeds/article-fetch";
import {
  collectArticle,
  scheduledArticles,
} from "../apps/worker/feeds/article-collector";
import { trialCatalog } from "../apps/worker/feeds/catalog";
import { app, type Bindings } from "../apps/worker";
import { collectSource } from "../apps/worker/feeds/collector";

let memory: ReturnType<typeof memoryD1>;
beforeEach(() => {
  memory = memoryD1();
});
afterEach(() => {
  memory.close();
  vi.unstubAllGlobals();
});
const longText =
  "Un paragraphe synthétique destiné à vérifier la lecture complète. ".repeat(
    55,
  );
const govHtml = `<html><main id="main"><div class="cmp-text"><p>${longText}</p><p>Dernière phrase du communiqué.</p></div></main></html>`;
const ipmHtml = `<html><meta name="robots" content="noarchive"><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", isAccessibleForFree: "True", articleBody: longText + " Dernière phrase." })}</script><div id="story-content-FREE"><div id="piano-paywall-FREE"><div id="article-text" class="ap-Story-content"><p>${longText}</p><p>Dernière phrase.</p></div></div></div></html>`;
function insert(
  id = "a".repeat(64),
  source = "gouvernement",
  access = "unknown",
) {
  const media = trialCatalog.find((s) => s.id === source)!;
  memory.sqlite
    .prepare(
      "INSERT INTO trial_articles(id,source_id,url,title,excerpt,collected_at,access_level) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      id,
      source,
      media.url + "news/test-article-" + id,
      "Titre synthétique",
      "Extrait synthétique",
      "2026-11-16T21:00:00Z",
      access,
    );
  return { id, url: media.url + "news/test-article-" + id, media };
}
function network(html = govHtml, robots = "User-agent: *\nAllow: /\n") {
  return vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      String(url).endsWith("/robots.txt")
        ? new Response(robots)
        : new Response(html, { headers: { "Content-Type": "text/html" } }),
    );
}
function row(id = "a".repeat(64)) {
  return memory.sqlite
    .prepare("SELECT * FROM trial_articles WHERE id=?")
    .get(id)!;
}

describe("bounded full-page fetch", () => {
  it("checks and caches robots, uses no cookies and returns the body beyond the RSS limit", async () => {
    const { url, media } = insert();
    const fetcher = network();
    const result = await fetchArticlePage(memory.db, url, media, fetcher);
    expect(result.status).toBe("available");
    expect(result.text.length).toBeGreaterThan(2000);
    expect(result.text).toContain("Dernière phrase");
    await fetchArticlePage(memory.db, url, media, fetcher);
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith("/robots.txt")),
    ).toHaveLength(1);
    for (const [, init] of fetcher.mock.calls)
      expect(init).toMatchObject({
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
      });
  });
  it.each([
    "https://127.0.0.1/secret",
    "https://gouvernement.lu:8443/page",
    "https://gouvernement.lu@evil.test/page",
    "http://gouvernement.lu/page",
  ])("rejects an untrusted URL %s before fetching", async (url) => {
    const fetcher = network();
    await expect(
      fetchArticlePage(memory.db, url, trialCatalog[8], fetcher),
    ).rejects.toThrow("url_refused");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not follow a private redirect, including robots redirects", async () => {
    const { url, media } = insert();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/private" },
      }),
    );
    await expect(
      fetchArticlePage(memory.db, url, media, fetcher),
    ).rejects.toThrow("robots_unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rechecks robots for a redirected article path before the next request", async () => {
    const { url, media } = insert();
    const fetcher = network("", "User-agent: *\nDisallow: /private\n");
    fetcher.mockImplementation(async (u) =>
      String(u).endsWith("/robots.txt")
        ? new Response("User-agent: *\nDisallow: /private\n")
        : new Response(null, {
            status: 302,
            headers: { location: "/private/page" },
          }),
    );
    await expect(
      fetchArticlePage(memory.db, url, media, fetcher),
    ).rejects.toThrow("robots_disallowed");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([403, 429, 500])(
    "does not request articles if robots returns %i",
    async (status) => {
      const { url, media } = insert();
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status }));
      await expect(
        fetchArticlePage(memory.db, url, media, fetcher),
      ).rejects.toThrow("robots_unavailable");
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("respects a specific product prohibition and crawl delay", async () => {
    const { url, media } = insert();
    const denied = network(
      govHtml,
      "User-agent: *\nAllow: /\nUser-agent: MyPressReview\nDisallow: /news\n",
    );
    await expect(
      fetchArticlePage(memory.db, url, media, denied),
    ).rejects.toThrow("robots_disallowed");
    expect(denied).toHaveBeenCalledTimes(1);
    memory.sqlite.exec("DELETE FROM trial_article_robots");
    expect(
      (
        await fetchArticlePage(
          memory.db,
          url,
          media,
          network(govHtml, "User-agent: *\nCrawl-delay: 120\n"),
        )
      ).crawlDelayMs,
    ).toBe(120000);
  });
  it.each(["nosnippet", "max-snippet: 0"])(
    "does not extract an X-Robots-Tag %s response",
    async (tag) => {
      const { url, media } = insert();
      const fetcher = network();
      fetcher.mockImplementation(async (u) =>
        String(u).endsWith("/robots.txt")
          ? new Response("User-agent: *\nAllow: /\n")
          : new Response(govHtml, {
              headers: { "Content-Type": "text/html", "X-Robots-Tag": tag },
            }),
      );
      await expect(
        fetchArticlePage(memory.db, url, media, fetcher),
      ).rejects.toThrow("publisher_policy");
    },
  );
  it("bounds streamed pages and rejects non-HTML", async () => {
    const { url, media } = insert();
    const fetcher = network("x".repeat(2_000_001));
    await expect(
      fetchArticlePage(memory.db, url, media, fetcher),
    ).rejects.toThrow("too_large");
    fetcher.mockResolvedValue(
      new Response(govHtml, { headers: { "Content-Type": "application/pdf" } }),
    );
    await expect(
      fetchArticlePage(memory.db, url, media, fetcher),
    ).rejects.toThrow("unsupported_content");
  });
});

describe("full-page D1 jobs and publisher isolation", () => {
  it("caches an eligible full article and serves all of it through the private detail only", async () => {
    const { id } = insert();
    const fetcher = network();
    expect(await collectArticle(memory.db, id, fetcher)).toMatchObject({
      processed: true,
      status: "available",
    });
    expect(String(row().full_text).length).toBeGreaterThan(2000);
    expect(await collectArticle(memory.db, id, fetcher)).toMatchObject({
      processed: false,
      reason: "not_due",
    });
    const env: Bindings = {
      DB: memory.db,
      ASSETS: {} as Fetcher,
      TEST_ACCESS_CODE: "test-access-code-long-for-api-only",
    };
    const login = await app.request(
      "https://review.test/api/trial/login",
      {
        method: "POST",
        headers: {
          Origin: "https://review.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: env.TEST_ACCESS_CODE }),
      },
      env,
    );
    const headers = { Cookie: login.headers.get("set-cookie")!.split(";")[0] };
    const read = await app.request(
      `https://review.test/api/trial/articles/${id}`,
      { headers },
      env,
    );
    expect(read.headers.get("cache-control")).toBe("no-store");
    const detail = (await read.json()) as {
      bodyText: string;
      contentKind: string;
    };
    expect(detail.contentKind).toBe("article");
    expect(detail.bodyText).toContain("Dernière phrase");
    const list = await app.request(
      "https://review.test/api/trial/workspace",
      { headers },
      env,
    );
    const listed = (await list.json()) as {
      articles: Record<string, unknown>[];
    };
    expect(listed.articles[0]).not.toHaveProperty("full_text");
    expect(listed.articles[0]).not.toHaveProperty("bodyText");
    const anonymous = await app.request(
      `https://review.test/api/trial/articles/${id}/content`,
      { method: "POST" },
      env,
    );
    expect(anonymous.status).toBe(401);
    const cross = await app.request(
      `https://review.test/api/trial/articles/${id}/content`,
      { method: "POST", headers: { ...headers, Origin: "https://evil.test" } },
      env,
    );
    expect(cross.status).toBe(403);
  });
  it("returns noarchive text live but never writes the body to D1", async () => {
    const { id } = insert(undefined, "dh", "free");
    const result = await collectArticle(memory.db, id, network(ipmHtml));
    expect(result).toMatchObject({ processed: true, status: "live" });
    expect("liveText" in result && result.liveText?.length).toBeGreaterThan(
      2000,
    );
    expect(row().full_text).toBe("");
    expect(row().full_status).toBe("live");
  });
  it.each([
    ["7sur7", "unknown"],
    ["figaro", "unknown"],
    ["investing", "unknown"],
    ["dh", "restricted"],
    ["lalibre", "unknown"],
  ])(
    "does not fetch a prohibited/unverified/restricted %s article",
    async (source, access) => {
      const { id } = insert(undefined, source, access);
      const fetcher = network();
      await collectArticle(memory.db, id, fetcher);
      expect(fetcher).not.toHaveBeenCalled();
      expect(row().full_text).toBe("");
    },
  );
  it("drops results when a source pauses mid-fetch and frees only its own lease", async () => {
    const { id } = insert();
    const fetcher = network();
    fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith("/robots.txt"))
        return new Response("User-agent: *\nAllow: /\n");
      memory.sqlite.exec(
        "UPDATE trial_sources SET enabled=0 WHERE id='gouvernement'",
      );
      return new Response(govHtml, {
        headers: { "Content-Type": "text/html" },
      });
    });
    expect(await collectArticle(memory.db, id, fetcher)).toMatchObject({
      processed: false,
      reason: "source_changed",
    });
    expect(row().full_text).toBe("");
    expect(
      memory.sqlite
        .prepare(
          "SELECT article_lease_owner FROM trial_sources WHERE id='gouvernement'",
        )
        .get()?.article_lease_owner,
    ).toBeNull();
  });
  it("a concurrent request cannot fetch a second article from the same source", async () => {
    const { id } = insert();
    const second = insert("b".repeat(64));
    let release!: () => void;
    let started!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const fetcher = network();
    fetcher.mockImplementation(async (url) => {
      if (String(url).endsWith("/robots.txt"))
        return new Response("User-agent: *\nAllow: /\n");
      started();
      await waiting;
      return new Response(govHtml, {
        headers: { "Content-Type": "text/html" },
      });
    });
    const first = collectArticle(memory.db, id, fetcher);
    await ready;
    expect(await collectArticle(memory.db, second.id, fetcher)).toMatchObject({
      processed: false,
      reason: "source_busy",
    });
    release();
    await first;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("revokes cached text when a feed newly marks an article restricted", async () => {
    const { id, url } = insert(undefined, "dh", "free");
    memory.sqlite
      .prepare(
        "UPDATE trial_articles SET full_status='available',full_text=? WHERE id=?",
      )
      .run(longText, id);
    const rss = `<rss><channel><item><title>Titre</title><link>${url}</link><description>Extrait</description><dcterms:accessRights>PAYING</dcterms:accessRights></item></channel></rss>`;
    await collectSource(
      memory.db,
      "dh",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(rss)),
    );
    expect(row().full_status).toBe("restricted");
    expect(row().full_text).toBe("");
  });
  it("runs two different source jobs concurrently, not two articles from one source", async () => {
    insert();
    insert("b".repeat(64), "lejsl", "free");
    let active = 0,
      max = 0;
    let unblock!: () => void;
    const both = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (url) => {
        if (String(url).endsWith("/robots.txt"))
          return new Response("User-agent: *\nAllow: /\n");
        max = Math.max(max, ++active);
        if (active === 2) unblock();
        await both;
        active--;
        return new Response(
          String(url).includes("lejsl")
            ? `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", isAccessibleForFree: true, articleBody: longText })}</script>`
            : govHtml,
          { headers: { "Content-Type": "text/html" } },
        );
      }),
    );
    await scheduledArticles(memory.db);
    expect(max).toBe(2);
  });
});
