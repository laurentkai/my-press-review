import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

export interface Bindings {
  DB: D1Database;
  ASSETS: Fetcher;
}

export const app = new Hono<{ Bindings: Bindings }>();
app.use("*", secureHeaders());
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  // Only these read-only, non-personal endpoints are public. New routes are
  // private by default, even if a future handler is registered below.
  const publicGet =
    c.req.method === "GET" &&
    ["/api/health", "/api/auth/providers"].includes(c.req.path);
  if (!publicGet && !c.req.path.startsWith("/api/auth/")) {
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
  // The trigger is wired, but intentionally does not collect or call AI yet.
  // This prevents external work before sources, credentials and access policies exist.
  async scheduled(
    _event: ScheduledController,
    _env: Bindings,
    _ctx: ExecutionContext,
  ): Promise<void> {},
} satisfies ExportedHandler<Bindings>;
