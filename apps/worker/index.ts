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
// Fail closed until real identity validation and owner-scoped repositories are implemented.
app.all("/api/me", (c) => c.json({ error: "UNAUTHENTICATED" }, 401));
for (const path of [
  "/api/sources",
  "/api/themes",
  "/api/subjects",
  "/api/articles",
  "/api/admin",
]) {
  app.all(path, (c) => c.json({ error: "UNAUTHENTICATED" }, 401));
  app.all(`${path}/*`, (c) => c.json({ error: "UNAUTHENTICATED" }, 401));
}
app.all("/api", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.all("/api/*", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

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
