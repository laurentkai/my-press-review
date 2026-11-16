// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, type Bindings } from "../apps/worker";
import { memoryD1 } from "./d1";

const origin = "https://review.test";
const id = "a".repeat(64);
let memory: ReturnType<typeof memoryD1>;
let env: Bindings;
beforeEach(() => {
  memory = memoryD1();
  env = {
    DB: memory.db,
    TEST_ACCESS_CODE: "high-entropy-test-code-not-a-production-secret",
    ASSETS: {} as Fetcher,
  };
  memory.sqlite
    .prepare(
      `INSERT INTO trial_articles(id,source_id,url,title,excerpt,published_at,collected_at,body_text,access_level)
    VALUES(?,'dh','https://www.dhnet.be/elections/fixture','Élection présidentielle','Extrait',NULL,'2026-11-16T10:00:00Z','Paragraphe de test','free')`,
    )
    .run(id);
});
afterEach(() => memory.close());
async function session() {
  const response = await app.request(
    origin + "/api/trial/login",
    {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ code: env.TEST_ACCESS_CODE }),
    },
    env,
  );
  return response.headers.get("set-cookie")!.split(";")[0];
}
describe("private article reading", () => {
  it("denies anonymous/forged access to the content and metadata", async () => {
    for (const headers of [
      {},
      { Cookie: "__Host-review_trial=" + "b".repeat(64) },
    ] as Record<string, string>[]) {
      const response = await app.request(
        origin + `/api/trial/articles/${id}`,
        { headers },
        env,
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain("Paragraphe");
    }
  });
  it("classifies old articles without a new fetch and returns text only in authenticated detail", async () => {
    const headers = { Cookie: await session() };
    const response = await app.request(
      origin + `/api/trial/articles/${id}`,
      { headers },
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      id,
      theme: "Politique",
      subtheme: "Élections",
      bodyText: "Paragraphe de test",
      imageUrl: null,
      accessLevel: "free",
    });
    const workspace = await app.request(
      origin + "/api/trial/workspace",
      { headers },
      env,
    );
    const result = (await workspace.json()) as {
      articles: Record<string, unknown>[];
    };
    expect(result.articles[0].theme).toBe("Politique");
    expect(result.articles[0]).not.toHaveProperty("bodyText");
  });
  it("withholds restricted content and articles from paused sources", async () => {
    const headers = { Cookie: await session() };
    memory.sqlite.exec("UPDATE trial_articles SET access_level='restricted'");
    const response = await app.request(
      origin + `/api/trial/articles/${id}`,
      { headers },
      env,
    );
    expect(response.status).toBe(404);
    memory.sqlite.exec("UPDATE trial_sources SET enabled=0 WHERE id='dh'");
    expect(
      (
        await app.request(
          origin + `/api/trial/articles/${id}`,
          { headers },
          env,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(
          origin + `/api/trial/articles/${"b".repeat(64)}`,
          { headers },
          env,
        )
      ).status,
    ).toBe(404);
  });
});
