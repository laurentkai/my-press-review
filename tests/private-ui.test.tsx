import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../apps/web/src/App";
import type {
  TrialWorkspace,
  TrialArticleDetail,
} from "../packages/shared/types";

afterEach(() => vi.unstubAllGlobals());
function backend(options: { detailStatus?: number; bodyText?: string } = {}) {
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
        theme: "Politique",
        subtheme: "Présidentielle",
        imageUrl: "https://www.dhnet.be/test.jpg",
        imageCredit: "Agence de test",
        accessLevel: "free",
        publisherCategories: ["Politique"],
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
  data.sources.push({
    ...data.sources[0],
    id: "figaro",
    name: "Le Figaro",
    url: "https://www.lefigaro.fr/",
  });
  const base = data.articles[0];
  data.articles.push(
    {
      ...base,
      id: "institutions",
      title: "Débat des institutions",
      subtheme: "Institutions",
      imageUrl: null,
    },
    {
      ...base,
      id: "football",
      title: "Victoire en football",
      theme: "Sport",
      subtheme: "Football",
      sourceId: "figaro",
      imageUrl: null,
    },
    {
      ...base,
      id: "tennis",
      title: "Finale de tennis",
      theme: "Sport",
      subtheme: "Tennis",
      imageUrl: null,
      accessLevel: "restricted",
      excerpt: "Extrait réservé du flux",
    },
    {
      ...base,
      id: "empty",
      title: "Annonce sans texte",
      theme: "Sport",
      subtheme: "Football",
      excerpt: "",
      imageUrl: null,
    },
  );
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
    if (path.startsWith("/api/trial/articles/")) {
      if (options.detailStatus) return json({}, options.detailStatus);
      const article = data.articles.find((entry) =>
        path.endsWith(`/${entry.id}`),
      );
      if (!article) return json({}, 404);
      const detail: TrialArticleDetail = {
        ...article,
        bodyText:
          options.bodyText ??
          (article.id === "test"
            ? "Premier paragraphe du flux.\n\nSecond paragraphe du flux."
            : ""),
      };
      return json(detail);
    }
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
      await screen.findByRole("button", {
        name: "Article de test privé",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Date de publication non précisée/)[0],
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

async function openWorkspace() {
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
  await screen.findByRole("button", {
    name: "Article de test privé",
  });
  return user;
}

describe("filtres et lecture des articles privés", () => {
  it("cumule thème, sous-thème, média et recherche puis réinitialise le sous-thème", async () => {
    backend();
    const user = await openWorkspace();
    const themes = screen.getByRole("group", { name: "Filtrer par thème" });
    await user.click(
      within(themes).getByRole("button", { name: /^Politique/ }),
    );
    await user.selectOptions(
      screen.getByLabelText("Filtrer par sous-thème"),
      "Présidentielle",
    );
    expect(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Débat des institutions",
      }),
    ).not.toBeInTheDocument();
    await user.click(within(themes).getByRole("button", { name: /^Sport/ }));
    expect(screen.getByLabelText("Filtrer par sous-thème")).toHaveValue("all");
    await user.selectOptions(
      screen.getByLabelText("Filtrer par sous-thème"),
      "Football",
    );
    await user.selectOptions(
      screen.getByLabelText("Filtrer par média"),
      "figaro",
    );
    await user.type(
      screen.getByLabelText("Rechercher les articles réels"),
      "victoire",
    );
    expect(
      screen.getByRole("button", { name: "Victoire en football" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Annonce sans texte" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/1 articles affichés/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrer par média"), "dh");
    expect(
      screen.getByRole("heading", {
        name: "Aucun article dans cette sélection.",
      }),
    ).toBeInTheDocument();
    await user.click(
      within(themes).getByRole("button", { name: /^Tous les thèmes/ }),
    );
    expect(
      screen.queryByLabelText("Filtrer par sous-thème"),
    ).not.toBeInTheDocument();
  });

  it("charge la lecture interne et conserve les filtres ainsi que le focus au retour", async () => {
    const api = backend();
    const user = await openWorkspace();
    await user.click(
      within(
        screen.getByRole("group", { name: "Filtrer par thème" }),
      ).getByRole("button", { name: /^Politique/ }),
    );
    await user.selectOptions(
      screen.getByLabelText("Filtrer par sous-thème"),
      "Présidentielle",
    );
    await user.selectOptions(screen.getByLabelText("Filtrer par média"), "dh");
    await user.type(
      screen.getByLabelText("Rechercher les articles réels"),
      "privé",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    );
    expect(
      await screen.findByText("Premier paragraphe du flux."),
    ).toBeInTheDocument();
    expect(screen.getByText("Second paragraphe du flux.")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(
      "/api/trial/articles/test",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
    const original = screen.getByRole("link", {
      name: "Lire l’article original sur La DH",
    });
    expect(original).toHaveAttribute(
      "href",
      "https://www.dhnet.be/test-fixture",
    );
    expect(original).toHaveAttribute("rel", "noreferrer noopener");
    const image = screen.getByRole("img", {
      name: "Illustration transmise par le média source",
    });
    expect(image).toHaveAttribute("src", "https://www.dhnet.be/test.jpg");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByText("Crédit : Agence de test")).toBeInTheDocument();
    fireEvent.error(image);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour à ma revue" }));
    expect(screen.getByLabelText("Filtrer par sous-thème")).toHaveValue(
      "Présidentielle",
    );
    expect(screen.getByLabelText("Filtrer par média")).toHaveValue("dh");
    expect(screen.getByLabelText("Rechercher les articles réels")).toHaveValue(
      "privé",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Article de test privé",
        }),
      ).toHaveFocus(),
    );
  });

  it("présente l’extrait réservé et le cas sans texte avec le lien original", async () => {
    backend();
    const user = await openWorkspace();
    await user.click(screen.getByRole("button", { name: "Finale de tennis" }));
    expect(
      await screen.findByText("Extrait réservé du flux"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Accès réservé chez l’éditeur"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Seul l’extrait du flux est présenté ici/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour à ma revue" }));
    await user.click(
      screen.getByRole("button", { name: "Annonce sans texte" }),
    );
    expect(
      await screen.findByText(
        /Ce flux ne fournit pas de texte pour cette nouvelle/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continuer chez La DH" }),
    ).toHaveAttribute("href", "https://www.dhnet.be/test-fixture");
  });

  it("affiche le HTML hostile comme texte sans créer d’élément actif", async () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    backend({ bodyText: hostile });
    const user = await openWorkspace();
    await user.click(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    );
    expect(await screen.findByText(hostile)).toBeInTheDocument();
    const reader = screen
      .getByRole("heading", { name: "Article de test privé" })
      .closest("article")!;
    expect(reader.querySelector("script")).toBeNull();
    expect(reader.querySelector("[onerror]")).toBeNull();
    expect(reader.querySelector('img[src="x"]')).toBeNull();
  });

  it("explique une erreur 404 et permet de revenir à la sélection", async () => {
    backend({ detailStatus: 404 });
    const user = await openWorkspace();
    await user.click(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cet article n’est plus disponible dans votre revue.",
    );
    expect(
      screen.getByRole("button", { name: "Réessayer" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour à ma revue" }));
    expect(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    ).toBeInTheDocument();
  });

  it("ferme la revue lors d’un 401 sur la lecture", async () => {
    backend({ detailStatus: 401 });
    const user = await openWorkspace();
    await user.click(
      screen.getByRole("button", {
        name: "Article de test privé",
      }),
    );
    expect(
      await screen.findByLabelText("Code d’accès temporaire"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Article de test privé")).not.toBeInTheDocument();
  });
});
