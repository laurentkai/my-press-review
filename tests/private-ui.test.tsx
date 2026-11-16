import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../apps/web/src/App";
import type { TrialWorkspace } from "../packages/shared/types";

afterEach(() => vi.unstubAllGlobals());
function backend() {
  let authenticated = false;
  const data: TrialWorkspace = {
    sources: [
      {
        id: "dh",
        name: "La DH",
        url: "https://www.dhnet.be/",
        category: "Belgique",
        feed: "https://www.dhnet.be/arc/outboundfeeds/rss/?outputType=xml",
        enabled: true,
        status: "ok",
        lastAttemptAt: 1,
        lastSuccessAt: 1,
        nextFetchAt: Date.now() + 900000,
        articleCount: 1,
      },
      {
        id: "lesoir",
        name: "Le Soir",
        url: "https://www.lesoir.be/",
        category: "Belgique",
        feed: null,
        enabled: false,
        status: "blocked_403",
        lastAttemptAt: null,
        lastSuccessAt: null,
        nextFetchAt: 0,
        articleCount: 0,
      },
    ],
    articles: [
      {
        id: "test",
        sourceId: "dh",
        url: "https://www.dhnet.be/test-fixture",
        title: "Article de test privé",
        excerpt: "Extrait de test, sans contenu réel.",
        publishedAt: null,
        collectedAt: "2026-11-16T10:00:00Z",
      },
    ],
  };
  const api = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    const path = String(url);
    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (path === "/api/trial/session")
      return json({ authenticated, available: true });
    if (path === "/api/auth/providers") return json({ providers: [] });
    if (path === "/api/trial/login") {
      authenticated = true;
      return json({ authenticated: true });
    }
    if (path === "/api/trial/logout") {
      authenticated = false;
      return json({ authenticated: false });
    }
    if (!authenticated) return json({}, 401);
    if (path === "/api/trial/workspace")
      return json({
        ...data,
        articles: data.sources[0].enabled ? data.articles : [],
      });
    if (path === "/api/trial/sources/dh" && init?.method === "PUT") {
      data.sources[0].enabled = false;
      return json({ enabled: false });
    }
    throw new Error("Unexpected request: " + path);
  });
  vi.stubGlobal("fetch", api);
  return api;
}
describe("private trial UI", () => {
  it("keeps trial data out of the public demo, logs in and logs out without storing a code", async () => {
    backend();
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText("Article de test privé")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connexion privée" }));
    await user.type(
      screen.getByLabelText("Code d’accès temporaire"),
      "temporary-code",
    );
    await user.click(
      screen.getByRole("button", { name: /Ouvrir ma revue privée/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Votre revue, en direct." }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Article de test privé" }),
    ).toHaveAttribute("href", "https://www.dhnet.be/test-fixture");
    expect(
      screen.getByText(/Date de publication non précisée/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(
      await screen.findByRole("heading", {
        name: "Retrouvez vos perspectives.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Article de test privé")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Code d’accès temporaire")).toHaveValue("");
  });
  it("shows blocked sources and pauses a supported source through the private API", async () => {
    const api = backend();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Connexion privée" }));
    await user.type(
      screen.getByLabelText("Code d’accès temporaire"),
      "temporary-code",
    );
    await user.click(
      screen.getByRole("button", { name: /Ouvrir ma revue privée/ }),
    );
    await screen.findByRole("heading", { name: "Votre revue, en direct." });
    await user.click(screen.getByRole("button", { name: "Mes sources" }));
    expect(
      await screen.findByText("Accès refusé par l’éditeur"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activer Le Soir" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Mettre en pause La DH" }),
    );
    expect(
      await screen.findByRole("button", { name: "Activer La DH" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(api).toHaveBeenCalledWith(
      "/api/trial/sources/dh",
      expect.objectContaining({ method: "PUT", body: '{"enabled":false}' }),
    );
  });
});
