import { describe, expect, it } from "vitest";
import { app } from "../apps/worker";

describe("API boundary before OAuth configuration", () => {
  it("exposes liveness without database details or secrets", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", version: "0.1.0" });
  });
  it.each([
    "/api/me",
    "/api/articles",
    "/api/articles/other-user",
    "/api/sources",
    "/api/sources/other-user",
    "/api/themes",
    "/api/subjects",
    "/api/admin/users",
  ])(
    "denies anonymous reads and writes to %s even with forged cookies",
    async (path) => {
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const response = await app.request(path, {
          method,
          headers: { Cookie: "session=fake", Authorization: "Bearer fake" },
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "UNAUTHENTICATED" });
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
    },
  );
  it("does not create a session or pretend OAuth works", async () => {
    const response = await app.request("/api/auth/microsoft");
    expect(response.status).toBe(503);
    expect(response.headers.has("set-cookie")).toBe(false);
    const providers = (await (
      await app.request("/api/auth/providers")
    ).json()) as { providers: { available: boolean }[] };
    expect(providers.providers.every((provider) => !provider.available)).toBe(
      true,
    );
  });
  it("never serves the SPA for an unknown API route", async () => {
    const response = await app.request("/api/missing");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
