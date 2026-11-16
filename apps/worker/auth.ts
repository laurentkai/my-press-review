import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Bindings } from "./index";

const COOKIE = "__Host-review_trial";
const encoder = new TextEncoder();
export const SESSION_TTL = 8 * 60 * 60_000;
export async function digest(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function trialAuthenticated(
  c: Context<{ Bindings: Bindings }>,
): Promise<boolean> {
  const code = c.env?.TEST_ACCESS_CODE;
  const token = getCookie(c, COOKIE);
  if (!code || code.length < 24 || !token || !/^[a-f0-9]{64}$/.test(token))
    return false;
  const session = await c.env.DB.prepare(
    "SELECT expires_at FROM trial_sessions WHERE token_hash = ? AND access_key_hash = ? AND expires_at > ?",
  )
    .bind(await digest(token), await digest(code), Date.now())
    .first();
  return !!session;
}
export function sameOrigin(c: Context<{ Bindings: Bindings }>): boolean {
  return c.req.header("Origin") === new URL(c.req.url).origin;
}

export async function loginTrial(c: Context<{ Bindings: Bindings }>) {
  if (!sameOrigin(c)) return c.json({ error: "ORIGIN_REFUSED" }, 403);
  const code = c.env?.TEST_ACCESS_CODE;
  if (!code || code.length < 24)
    return c.json({ error: "TRIAL_NOT_CONFIGURED" }, 503);
  // Bound the actual streamed body; Content-Length is not trusted.
  const reader = c.req.raw.body?.getReader();
  if (!reader) return c.json({ error: "INVALID_REQUEST" }, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1024) {
        await reader.cancel();
        return c.json({ error: "REQUEST_TOO_LARGE" }, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    const input =
      typeof parsed === "object" &&
      parsed !== null &&
      "code" in parsed &&
      typeof parsed.code === "string"
        ? parsed.code
        : "";
    const now = Date.now();
    const key = await digest(
      `${c.req.header("CF-Connecting-IP") ?? "local"}:${Math.floor(now / 600_000)}`,
    );
    const previous = await c.env.DB.prepare(
      "SELECT attempts FROM trial_login_limits WHERE bucket=?",
    )
      .bind(key)
      .first<{ attempts: number }>();
    if (previous && previous.attempts >= 8)
      return c.json({ error: "RATE_LIMITED" }, 429, { "Retry-After": "600" });
    const limit = await c.env.DB.prepare(
      "INSERT INTO trial_login_limits(bucket, attempts, expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 WHERE trial_login_limits.attempts<8 RETURNING attempts",
    )
      .bind(key, now + 600_000)
      .first<{ attempts: number }>();
    if (!limit || limit.attempts > 8)
      return c.json({ error: "RATE_LIMITED" }, 429, { "Retry-After": "600" });
    const actual = await digest(input);
    const expected = await digest(code);
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++)
      mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
    if (mismatch !== 0) return c.json({ error: "INVALID_CODE" }, 401);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    await c.env.DB.prepare(
      "INSERT INTO trial_sessions(token_hash,access_key_hash,expires_at) VALUES(?,?,?)",
    )
      .bind(await digest(token), expected, now + SESSION_TTL)
      .run();
    setCookie(c, COOKIE, token, {
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
      path: "/",
      maxAge: SESSION_TTL / 1000,
    });
    return c.json({ authenticated: true });
  } catch (error) {
    return error instanceof SyntaxError
      ? c.json({ error: "INVALID_REQUEST" }, 400)
      : c.json({ error: "SERVICE_UNAVAILABLE" }, 503);
  } finally {
    reader.releaseLock();
  }
}
export async function logoutTrial(c: Context<{ Bindings: Bindings }>) {
  const token = getCookie(c, COOKIE);
  if (token)
    await c.env.DB.prepare("DELETE FROM trial_sessions WHERE token_hash = ?")
      .bind(await digest(token))
      .run();
  deleteCookie(c, COOKIE, {
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
  });
  return c.json({ authenticated: false });
}
