// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseFeed,
  plainText,
  publicationDate,
} from "../apps/worker/feeds/parser";
import { trialCatalog, MIN_INTERVAL } from "../apps/worker/feeds/catalog";
import {
  fetchFeed,
  collectSource,
  scheduledCollection,
} from "../apps/worker/feeds/collector";
import { memoryD1 } from "./d1";

const source = trialCatalog[1];
const xml = (items: string) =>
  `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
const item = (path = "news/story", extra = "") =>
  `<item><title>Un titre &amp; une analyse</title><link>https://www.dhnet.be/${path}</link><description><![CDATA[<p>Un extrait <b>simple</b></p><script>danger()</script>]]></description><pubDate>Mon, 16 Nov 2026 10:00:00 +0100</pubDate>${extra}</item>`;
const databases: ReturnType<typeof memoryD1>[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
  vi.unstubAllGlobals();
});
function database() {
  const value = memoryD1();
  databases.push(value);
  return value;
}

describe("RSS normalization and bounds", () => {
  it("keeps only publisher links and plain excerpts, deduplicates inside a feed", () => {
    const result = parseFeed(
      xml(
        item() +
          item() +
          item("news/bad", "<dpp:paid>true</dpp:paid>") +
          item("news/other").replace(
            "https://www.dhnet.be/news/other",
            "javascript:alert(1)",
          ),
      ),
      source,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Un titre & une analyse",
      excerpt: "Un extrait simple",
      url: "https://www.dhnet.be/news/story",
      publishedAt: "2026-11-16T09:00:00.000Z",
    });
  });
  it("supports Atom and RSS sent with the wrong media type", async () => {
    expect(
      parseFeed(
        '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Article</title><link href="https://www.dhnet.be/news/atom" rel="alternate"/><summary>Extrait</summary><updated>2026-11-15T12:00:00Z</updated></entry></feed>',
        source,
      )[0].url,
    ).toContain("/news/atom");
    const result = await fetchFeed(
      source,
      { id: source.id, etag: null, last_modified: null },
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(xml(item()), {
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    expect(result.items).toHaveLength(1);
  });
  it.each([
    '<!DOCTYPE rss [<!ENTITY test "expansion">]><rss/>',
    "<html>Consentement</html>",
    "<rss><channel>",
    "<rss>" + "<nested>".repeat(33) + "</nested>".repeat(33) + "</rss>",
  ])("rejects unsafe or invalid XML", (value) =>
    expect(() => parseFeed(value, source)).toThrow(),
  );
  it("does not invent the timezone of an Investing date or expose full HTML", () => {
    expect(publicationDate("2026-11-16 15:11:23")).toBeNull();
    expect(
      plainText(
        "&lt;img src=x onerror=alert(1)&gt; Texte " + "a".repeat(500),
        100,
      ),
    ).toHaveLength(100);
    expect(
      parseFeed(
        xml(
          item().replace(
            "https://www.dhnet.be/news/story",
            "https://127.0.0.1/private",
          ),
        ),
        source,
      ),
    ).toEqual([]);
  });
  it("rejects extra items instead of unbounded parsing", () =>
    expect(() => parseFeed(xml(item().repeat(201)), source)).toThrow(
      "too_many_items",
    ));
});
describe("safe HTTP collection", () => {
  it.each([
    "http://www.dhnet.be/feed",
    "https://127.0.0.1/private",
    "https://www.dhnet.be@attacker.test/feed",
    "https://www.dhnet.be:8443/feed",
  ])("refuses redirected URL %s without fetching it", async (location) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location } }),
      );
    await expect(
      fetchFeed(
        source,
        { id: source.id, etag: null, last_modified: null },
        fetcher,
      ),
    ).rejects.toThrow("redirect_refused");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.redirect).toBe("manual");
  });
  it("does not follow a consent gateway or retry a 403", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://myprivacy.dpgmedia.be/consent" },
      }),
    );
    await expect(
      fetchFeed(
        trialCatalog[0],
        { id: "7sur7", etag: null, last_modified: null },
        fetcher,
      ),
    ).rejects.toThrow("consent_required");
    fetcher.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(
      fetchFeed(
        source,
        { id: source.id, etag: null, last_modified: null },
        fetcher,
      ),
    ).rejects.toThrow("blocked_403");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("bounds streamed responses even without Content-Length", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("a".repeat(1_000_001)));
    await expect(
      fetchFeed(
        source,
        { id: source.id, etag: null, last_modified: null },
        fetcher,
      ),
    ).rejects.toThrow("too_large");
  });
});
describe("D1 collection state, lease and deduplication", () => {
  it("stores a real feed once, respects the minimum cadence, and handles 304", async () => {
    const { db, sqlite } = database();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(xml(item()), { headers: { etag: '"v1"' } }),
      );
    expect(await collectSource(db, "dh", fetcher)).toMatchObject({
      processed: true,
      status: "ok",
      count: 1,
    });
    expect(await collectSource(db, "dh", fetcher)).toMatchObject({
      processed: false,
      status: "not_due",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    sqlite.exec("UPDATE trial_sources SET next_fetch_at=0 WHERE id='dh'");
    await collectSource(db, "dh", fetcher);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM trial_articles").get()
        ?.count,
    ).toBe(1);
    sqlite.exec("UPDATE trial_sources SET next_fetch_at=0 WHERE id='dh'");
    fetcher.mockResolvedValue(new Response(null, { status: 304 }));
    expect(await collectSource(db, "dh", fetcher)).toMatchObject({
      status: "not_modified",
    });
    expect(fetcher.mock.calls.at(-1)?.[1]?.headers).toMatchObject({
      "If-None-Match": '"v1"',
    });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM trial_articles").get()
        ?.count,
    ).toBe(1);
  });
  it("does not fetch paused/unavailable sources or concurrent leases", async () => {
    const { db, sqlite } = database();
    const fetcher = vi.fn<typeof fetch>();
    sqlite.exec("UPDATE trial_sources SET enabled=0 WHERE id='dh'");
    expect((await collectSource(db, "dh", fetcher)).processed).toBe(false);
    expect((await collectSource(db, "lesoir", fetcher)).processed).toBe(false);
    sqlite
      .prepare("UPDATE trial_sources SET enabled=1,lease_until=? WHERE id='dh'")
      .run(Date.now() + MIN_INTERVAL);
    expect((await collectSource(db, "dh", fetcher)).processed).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retains earlier articles after a source error and records backoff", async () => {
    const { db, sqlite } = database();
    await collectSource(
      db,
      "dh",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(xml(item()))),
    );
    sqlite.exec("UPDATE trial_sources SET next_fetch_at=0 WHERE id='dh'");
    const now = Date.now();
    await collectSource(
      db,
      "dh",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 403 })),
      now,
    );
    const row = sqlite
      .prepare("SELECT status,next_fetch_at FROM trial_sources WHERE id='dh'")
      .get();
    expect(row?.status).toBe("blocked_403");
    expect(Number(row?.next_fetch_at)).toBeGreaterThan(now + MIN_INTERVAL);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM trial_articles").get()
        ?.count,
    ).toBe(1);
  });
  it("the scheduler processes only one due source and purges expired sessions", async () => {
    const { db, sqlite } = database();
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("<rss><channel/></rss>")),
    );
    sqlite.exec("INSERT INTO trial_sessions VALUES('expired','key',0)");
    await scheduledCollection(db);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM trial_sessions").get()
        ?.count,
    ).toBe(0);
  });
});
