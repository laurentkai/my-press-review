import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import {
  trialAuthenticated,
  loginTrial,
  logoutTrial,
  sameOrigin,
} from "./auth";
import { workspace, toggleSource, refreshSource, readArticle } from "./trial";
import { scheduledCollection } from "./feeds/collector";

export interface Bindings {
  DB: D1Database;
  ASSETS: Fetcher;
  TEST_ACCESS_CODE?: string;
}

export const app = new Hono<{ Bindings: Bindings }>();
app.use("*", secureHeaders());
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  // Only these read-only, non-personal endpoints are public. New routes are
  // private by default, even if a future handler is registered below.
  const publicGet =
    c.req.method === "GET" &&
    ["/api/health", "/api/auth/providers", "/api/trial/session"].includes(
      c.req.path,
    );
  const login = c.req.path === "/api/trial/login" && c.req.method === "POST";
  // Logout is idempotent, including after expiry; it never exposes data.
  if (c.req.path === "/api/trial/logout" && c.req.method === "POST") {
    if (!sameOrigin(c)) return c.json({ error: "ORIGIN_REFUSED" }, 403);
    return next();
  }
  const trialRoute =
    c.req.path === "/api/trial/workspace" ||
    /^\/api\/trial\/articles\/[a-f0-9]{64}$/.test(c.req.path) ||
    c.req.path === "/api/trial/logout" ||
    /^\/api\/trial\/sources\/[a-z0-9]+(?:\/refresh)?$/.test(c.req.path);
  if (trialRoute && (await trialAuthenticated(c))) {
    if (!["GET", "HEAD"].includes(c.req.method) && !sameOrigin(c))
      return c.json({ error: "ORIGIN_REFUSED" }, 403);
    return next();
  }
  if (!publicGet && !login && !c.req.path.startsWith("/api/auth/")) {
    return c.json({ error: "UNAUTHENTICATED" }, 401);
  }
  await next();
});
app.get("/api/health", (c) => c.json({ status: "ok", version: "0.1.0" }));
app.get("/api/auth/providers", (c) =>
  c.json({
    providers: [
      { id: "microsoft", name: "Microsoft / Hotmail", available: false },
      { id: "apple", name: "Apple", available: false },
    ],
  }),
);
app.get("/api/trial/session", async (c) =>
  c.json({
    authenticated: await trialAuthenticated(c),
    available: !!c.env?.TEST_ACCESS_CODE && c.env.TEST_ACCESS_CODE.length >= 24,
  }),
);
app.post("/api/trial/login", loginTrial);
app.post("/api/trial/logout", logoutTrial);
app.get("/api/trial/workspace", workspace);
app.get("/api/trial/articles/:id", readArticle);
app.put("/api/trial/sources/:id", toggleSource);
app.post("/api/trial/sources/:id/refresh", refreshSource);
app.all("/api/auth/*", (c) =>
  c.json(
    {
      error: "AUTH_NOT_CONFIGURED",
      message: "La connexion OAuth n’est pas encore configurée.",
    },
    503,
  ),
);
app.all("/api", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.all("/api/*", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.notFound((c) => c.json({ error: "NOT_FOUND" }, 404));

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledController,
    env: Bindings,
    _ctx: ExecutionContext,
  ): Promise<void> {
    if (env.TEST_ACCESS_CODE && env.TEST_ACCESS_CODE.length >= 24)
      await scheduledCollection(env.DB);
  },
} satisfies ExportedHandler<Bindings>;
