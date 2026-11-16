// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryD1 } from "./d1";
import { app, type Bindings } from "../apps/worker";
import { collectSource } from "../apps/worker/feeds/collector";
import { parseFeed } from "../apps/worker/feeds/parser";
import { trialCatalog } from "../apps/worker/feeds/catalog";
let memory: ReturnType<typeof memoryD1>, env: Bindings;
const origin = "https://review.test";
beforeEach(() => {
  memory = memoryD1();
  env = {
    DB: memory.db,
    ASSETS: {} as Fetcher,
    TEST_ACCESS_CODE: "fixture-code-strong-enough-for-test-only",
  };
});
afterEach(() => memory.close());
async function headers() {
  const r = await app.request(
    origin + "/api/trial/login",
    {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ code: env.TEST_ACCESS_CODE }),
    },
    env,
  );
  return { Cookie: r.headers.get("set-cookie")!.split(";")[0] };
}
function add(id: string, access = "free", status = "pending") {
  memory.sqlite
    .prepare(
      "INSERT INTO trial_articles(id,source_id,url,title,excerpt,collected_at,access_level,full_status) VALUES(?,'dh',?,?,?,'2026-11-16T22:00:00Z',?,?)",
    )
    .run(
      id,
      "https://www.dhnet.be/news/" + id,
      "Titre " + id,
      "Extrait " + id,
      access,
      status,
    );
}

describe("only confirmed available news", () => {
  it("excludes known subscriber articles and unknown access before source ranking/counts", async () => {
    for (let i = 0; i < 25; i++) add("paid" + i, "restricted");
    add("pagepaid", "free", "restricted");
    add("unknown", "unknown");
    add("free");
    add("verifiedpage", "unknown", "available");
    const response = await app.request(
      origin + "/api/trial/workspace",
      { headers: await headers() },
      env,
    );
    const w = (await response.json()) as {
      articles: { id: string }[];
      sources: { id: string; articleCount: number }[];
    };
    expect(w.articles.map((a) => a.id).sort()).toEqual([
      "free",
      "verifiedpage",
    ]);
    expect(w.sources.find((s) => s.id === "dh")?.articleCount).toBe(2);
  });
  it.each([
    ["restricted", "pending"],
    ["free", "restricted"],
    ["unknown", "pending"],
  ])("saved detail URL cannot expose %s/%s", async (access, status) => {
    const id = "a".repeat(64);
    add(id, access, status);
    const response = await app.request(
      origin + `/api/trial/articles/${id}`,
      { headers: await headers() },
      env,
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("Extrait");
  });
  it("does not insert new PAYING/MEMBER articles from RSS", async () => {
    const rss =
      "<rss><channel>" +
      ["PAYING", "MEMBER"]
        .map(
          (rights, i) =>
            `<item><title>Abonné ${i}</title><link>https://www.dhnet.be/news/paid${i}</link><description>Extrait</description><dcterms:accessRights>${rights}</dcterms:accessRights></item>`,
        )
        .join("") +
      "</channel></rss>";
    await collectSource(
      memory.db,
      "dh",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(rss)),
    );
    expect(
      memory.sqlite.prepare("SELECT COUNT(*) n FROM trial_articles").get()?.n,
    ).toBe(0);
  });
  it("revokes an old free DPP article that becomes paid instead of silently retaining it", async () => {
    const id = "a".repeat(64);
    memory.sqlite
      .prepare(
        "INSERT INTO trial_articles(id,source_id,url,title,excerpt,collected_at,access_level,full_status,full_text) VALUES(?,'7sur7','https://www.7sur7.be/news/paid','Ancien titre','Ancien extrait','2026-11-16T22:00:00Z','free','available','Ancien corps')",
      )
      .run(id);
    const rss =
      "<rss><channel><item><title>Réservé</title><link>https://www.7sur7.be/news/paid</link><dpp:paid>true</dpp:paid></item></channel></rss>";
    await collectSource(
      memory.db,
      "7sur7",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(rss)),
    );
    expect(
      memory.sqlite
        .prepare(
          "SELECT access_level,full_text,excerpt FROM trial_articles WHERE id=?",
        )
        .get(id),
    ).toMatchObject({ access_level: "restricted", full_text: "", excerpt: "" });
  });
  it("positive free markers are recognized, and an explicit restriction always wins", () => {
    const item = (extra: string) =>
      `<rss><channel><item><title>Test</title><link>https://www.7sur7.be/news/test</link>${extra}</item></channel></rss>`;
    expect(
      parseFeed(item("<dpp:paid>false</dpp:paid>"), trialCatalog[0])[0]
        .accessLevel,
    ).toBe("free");
    expect(
      parseFeed(
        item(
          "<dpp:paid>false</dpp:paid><dcterms:accessRights>MEMBER</dcterms:accessRights>",
        ),
        trialCatalog[0],
      )[0].accessLevel,
    ).toBe("restricted");
    expect(
      parseFeed(item("<dpp:paid>true</dpp:paid>"), trialCatalog[0]),
    ).toHaveLength(0);
    expect(
      parseFeed(item("<dpp:paid>true</dpp:paid>"), trialCatalog[0], true)[0]
        .accessLevel,
    ).toBe("restricted");
  });
});
