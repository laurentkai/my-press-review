// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, type Bindings } from "../apps/worker";
import { memoryD1 } from "./d1";

const code = "test-access-code-with-high-entropy-fixture";
let memory: ReturnType<typeof memoryD1>;
let env: Bindings;
const origin = "https://review.test";
beforeEach(() => {
  memory = memoryD1();
  env = { DB: memory.db, TEST_ACCESS_CODE: code, ASSETS: {} as Fetcher };
});
afterEach(() => memory.close());
function login(input = code, headers = { Origin: origin }) {
  return app.request(
    origin + "/api/trial/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ code: input }),
    },
    env,
  );
}
async function cookie() {
  return (await login()).headers.get("set-cookie")!.split(";")[0];
}

describe("temporary private access", () => {
  it("denies private trial data anonymously, exposes no real sources in public session status", async () => {
    const result = await app.request(origin + "/api/trial/session", {}, env);
    expect(await result.json()).toEqual({
      authenticated: false,
      available: true,
    });
    expect(
      (await app.request(origin + "/api/trial/workspace", {}, env)).status,
    ).toBe(401);
  });
  it("issues a secure opaque session, keeps the code out of responses, and revokes it on logout", async () => {
    const result = await login();
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    const setCookie = result.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).not.toContain(code);
    expect(await result.text()).not.toContain(code);
    const session = setCookie.split(";")[0];
    const workspace = await app.request(
      origin + "/api/trial/workspace",
      { headers: { Cookie: session } },
      env,
    );
    const data = (await workspace.json()) as { sources: unknown[] };
    expect(workspace.status).toBe(200);
    expect(data.sources).toHaveLength(9);
    expect(
      (
        await app.request(
          origin + "/api/admin/users",
          { headers: { Cookie: session } },
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await app.request(
          origin + "/api/trial/logout",
          { method: "POST", headers: { Cookie: session, Origin: origin } },
          env,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          origin + "/api/trial/workspace",
          { headers: { Cookie: session } },
          env,
        )
      ).status,
    ).toBe(401);
  });
  it("refuses forged, expired and rotated sessions", async () => {
    expect(
      (
        await app.request(
          origin + "/api/trial/workspace",
          { headers: { Cookie: "__Host-review_trial=" + "a".repeat(64) } },
          env,
        )
      ).status,
    ).toBe(401);
    const session = await cookie();
    env.TEST_ACCESS_CODE = "rotated-access-code-more-than-24-characters";
    expect(
      (
        await app.request(
          origin + "/api/trial/workspace",
          { headers: { Cookie: session } },
          env,
        )
      ).status,
    ).toBe(401);
    env.TEST_ACCESS_CODE = code;
    memory.sqlite.exec("UPDATE trial_sessions SET expires_at=0");
    expect(
      (
        await app.request(
          origin + "/api/trial/workspace",
          { headers: { Cookie: session } },
          env,
        )
      ).status,
    ).toBe(401);
  });
  it("rejects cross-origin login/mutations and never permits arbitrary source URLs", async () => {
    expect(
      (await login(code, { Origin: "https://attacker.test" })).status,
    ).toBe(403);
    const session = await cookie();
    expect(
      (
        await app.request(
          origin + "/api/trial/sources/dh",
          {
            method: "PUT",
            headers: { Cookie: session, Origin: "https://attacker.test" },
            body: JSON.stringify({ enabled: false }),
          },
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(
          origin + "/api/trial/sources/lesoir",
          {
            method: "PUT",
            headers: { Cookie: session, Origin: origin },
            body: JSON.stringify({ enabled: true }),
          },
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(
          origin + "/api/trial/sources/custom",
          {
            method: "PUT",
            headers: { Cookie: session, Origin: origin },
            body: JSON.stringify({ url: "http://127.0.0.1" }),
          },
          env,
        )
      ).status,
    ).toBe(404);
  });
  it("limits login attempts durably and refuses oversized payloads", async () => {
    for (let i = 0; i < 8; i++) expect((await login("wrong")).status).toBe(401);
    expect((await login()).status).toBe(429);
    for (let i = 0; i < 3; i++) expect((await login()).status).toBe(429);
    expect(
      memory.sqlite.prepare("SELECT attempts FROM trial_login_limits").get()
        ?.attempts,
    ).toBe(8);
    expect((await login("x".repeat(1100))).status).toBe(413);
  });
  it("clears the browser cookie even if its session has already expired", async () => {
    const session = await cookie();
    memory.sqlite.exec("UPDATE trial_sessions SET expires_at=0");
    const response = await app.request(
      origin + "/api/trial/logout",
      { method: "POST", headers: { Cookie: session, Origin: origin } },
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(
      memory.sqlite
        .prepare("SELECT COUNT(*) AS count FROM trial_sessions")
        .get()?.count,
    ).toBe(0);
    expect(
      (
        await app.request(
          origin + "/api/trial/logout",
          { method: "POST", headers: { Origin: "https://attacker.test" } },
          env,
        )
      ).status,
    ).toBe(403);
  });
});
