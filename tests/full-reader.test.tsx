import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleReader } from "../apps/web/src/ArticleReader";
import type {
  TrialArticle,
  TrialArticleDetail,
  TrialSource,
} from "../packages/shared/types";

const source: TrialSource = {
  id: "dh",
  name: "La DH",
  url: "https://www.dhnet.be/",
  category: "Belgique",
  feed: "https://www.dhnet.be/rss",
  enabled: true,
  status: "ok",
  lastAttemptAt: null,
  lastSuccessAt: null,
  nextFetchAt: 0,
  articleCount: 1,
};
const article: TrialArticle = {
  id: "reader-test",
  sourceId: source.id,
  url: "https://www.dhnet.be/fixture-reader",
  title: "Article synthétique",
  excerpt: "Extrait synthétique du flux à conserver.",
  theme: "Société",
  subtheme: null,
  imageUrl: null,
  imageCredit: "",
  accessLevel: "free",
  publisherCategories: [],
  publishedAt: null,
  collectedAt: "2026-11-16T12:00:00Z",
  fullTextStatus: "pending",
};
const lastSentence =
  "Dernière phrase synthétique après la limite des anciens extraits.";
const hostile = '<img src="x" onerror="alert(1)"><script>alert(2)</script>';
const fullText = `${"Paragraphe synthétique complet pour vérifier la lecture sans troncature. ".repeat(60).trim()}\n\n${hostile}\n\n${lastSentence}`;
const detail = (
  changes: Partial<TrialArticleDetail> = {},
): TrialArticleDetail => ({
  ...article,
  bodyText: article.excerpt,
  contentKind: "feed",
  fullTextReason: "",
  fullTextNextAttemptAt: 0,
  ...changes,
});
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function mount() {
  const onBack = vi.fn();
  const onExpired = vi.fn();
  const rendered = render(
    <ArticleReader
      article={article}
      source={source}
      onBack={onBack}
      onExpired={onExpired}
    />,
  );
  return { ...rendered, onBack, onExpired };
}
function mockFetch() {
  const api = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", api);
  return api;
}
afterEach(() => vi.unstubAllGlobals());

describe("lecture complète à la demande", () => {
  it("affiche l’intégralité persistée après POST puis second GET sans injecter de HTML", async () => {
    const api = mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockResolvedValueOnce(
        json({
          status: "available",
          reason: "body_extracted",
          nextAttemptAt: 0,
        }),
      )
      .mockResolvedValueOnce(
        json(
          detail({
            bodyText: fullText,
            contentKind: "article",
            fullTextStatus: "available",
            fullTextReason: "body_extracted",
          }),
        ),
      );
    const { container } = mount();
    expect(fullText.length).toBeGreaterThan(2000);
    expect(await screen.findByText(lastSentence)).toBeVisible();
    expect(screen.getByText(hostile)).toBeVisible();
    expect(screen.getByText(fullText.split("\n\n")[0]!)).toBeVisible();
    expect(screen.getByText("Article en lecture")).toBeVisible();
    expect(
      container.querySelector("script, [onerror], img[src='x']"),
    ).toBeNull();
    expect(
      api.mock.calls.map(([url, init]) => [String(url), init?.method ?? "GET"]),
    ).toEqual([
      ["/api/trial/articles/reader-test", "GET"],
      ["/api/trial/articles/reader-test/content", "POST"],
      ["/api/trial/articles/reader-test", "GET"],
    ]);
    for (const [, init] of api.mock.calls)
      expect(init).toMatchObject({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      });
    expect(
      screen.getByRole("link", { name: "Lire l’article original sur La DH" }),
    ).toHaveAttribute("href", article.url);
    expect(
      screen.getByRole("link", { name: "Continuer chez La DH" }),
    ).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("affiche liveText directement sans second GET ni archivage annoncé", async () => {
    const api = mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockResolvedValueOnce(
        json({
          status: "live",
          reason: "body_extracted",
          nextAttemptAt: 0,
          liveText: fullText,
        }),
      );
    mount();
    expect(await screen.findByText(lastSentence)).toBeVisible();
    expect(screen.getByText(hostile)).toBeVisible();
    expect(screen.getByText(/sans archivage dans La Revue/)).toBeVisible();
    expect(api).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("link", { name: "Lire l’article original sur La DH" }),
    ).toHaveAttribute("href", article.url);
  });

  it.each(["available", "live"] as const)(
    "ne relance pas un corps article déjà %s",
    async (status) => {
      const api = mockFetch().mockResolvedValueOnce(
        json(
          detail({
            bodyText: fullText,
            contentKind: "article",
            fullTextStatus: status,
          }),
        ),
      );
      mount();
      expect(await screen.findByText(lastSentence)).toBeVisible();
      expect(api).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    {
      fullTextStatus: "restricted" as const,
      accessLevel: "restricted" as const,
      fullTextReason: "access_restricted",
    },
    {
      fullTextStatus: "unavailable" as const,
      fullTextReason: "publisher_policy",
    },
    {
      fullTextStatus: "unavailable" as const,
      fullTextReason: "source_unverified",
    },
    { fullTextStatus: "pending" as const, fullTextReason: "publisher_policy" },
    { fullTextStatus: "pending" as const, fullTextReason: "source_unverified" },
  ])(
    "ne POST jamais un contenu interdit : $fullTextStatus/$fullTextReason",
    async (changes) => {
      const api = mockFetch().mockResolvedValueOnce(json(detail(changes)));
      mount();
      expect(await screen.findByText(article.excerpt)).toBeVisible();
      expect(api).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole("button", { name: "Rechercher le texte complet" }),
      ).not.toBeInTheDocument();
    },
  );

  it("le statut restricted seul suffit à empêcher un POST", async () => {
    const pending = deferred<Response>();
    const api = mockFetch()
      .mockResolvedValueOnce(
        json(
          detail({
            fullTextStatus: "restricted",
            fullTextReason: "",
            accessLevel: "free",
          }),
        ),
      )
      .mockReturnValueOnce(pending.promise);
    mount();
    await act(async () => {});
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByText(article.excerpt)).toBeVisible();
  });

  it("respecte nextAttemptAt et garde l’extrait pendant le délai", async () => {
    const api = mockFetch().mockResolvedValueOnce(
      json(
        detail({
          fullTextStatus: "unavailable",
          fullTextReason: "rate_limited",
          fullTextNextAttemptAt: Date.now() + 3600000,
        }),
      ),
    );
    mount();
    expect(await screen.findByText(article.excerpt)).toBeVisible();
    expect(
      screen.getByText(/Prochaine tentative possible après/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Rechercher le texte complet" }),
    ).toBeDisabled();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("conserve l’extrait pendant une récupération pending", async () => {
    const pending = deferred<Response>();
    const api = mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockReturnValueOnce(pending.promise);
    const { unmount } = mount();
    expect(await screen.findByText(article.excerpt)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de l’article",
    );
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    const signal = api.mock.calls[1]![1]!.signal!;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it.each(["GET", "POST"])(
    "appelle onExpired lors du 401 %s",
    async (stage) => {
      const api = mockFetch();
      if (stage === "POST") api.mockResolvedValueOnce(json(detail()));
      api.mockResolvedValueOnce(json({}, 401));
      const { onExpired } = mount();
      await waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
      expect(api).toHaveBeenCalledTimes(stage === "GET" ? 1 : 2);
      expect(screen.queryByText(lastSentence)).not.toBeInTheDocument();
    },
  );

  it("conserve l’extrait et affiche un message lors d’une erreur réseau du POST", async () => {
    mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockRejectedValueOnce(new TypeError("Connexion interrompue"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connexion interrompue",
    );
    expect(screen.getByText(article.excerpt)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Lire l’article original sur La DH" }),
    ).toHaveAttribute("href", article.url);
  });

  it("annule la récupération au retour et ignore sa réponse tardive", async () => {
    const pending = deferred<Response>();
    const api = mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockReturnValueOnce(pending.promise);
    const onExpired = vi.fn();
    function ReaderWithBack() {
      const [open, setOpen] = useState(true);
      return open ? (
        <ArticleReader
          article={article}
          source={source}
          onExpired={onExpired}
          onBack={() => setOpen(false)}
        />
      ) : (
        <p>Liste des articles</p>
      );
    }
    render(<ReaderWithBack />);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    const signal = api.mock.calls[1]![1]!.signal!;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retour à ma revue" }));
    expect(signal.aborted).toBe(true);
    await act(async () =>
      pending.resolve(
        json({
          status: "live",
          reason: "body_extracted",
          nextAttemptAt: 0,
          liveText: fullText,
        }),
      ),
    );
    expect(screen.getByText("Liste des articles")).toBeVisible();
    expect(screen.queryByText(lastSentence)).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(2);
  });

  it("une réponse tardive ne remplace pas le texte d’un autre article", async () => {
    const pending = deferred<Response>();
    const second: TrialArticle = {
      ...article,
      id: "second",
      title: "Autre article synthétique",
    };
    const secondDetail = detail({
      ...second,
      bodyText: "Corps exclusif du second article.",
      contentKind: "article",
      fullTextStatus: "available",
    });
    const api = mockFetch()
      .mockResolvedValueOnce(json(detail()))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(json(secondDetail));
    const { rerender, onBack, onExpired } = mount();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    const signal = api.mock.calls[1]![1]!.signal!;
    rerender(
      <ArticleReader
        article={second}
        source={source}
        onBack={onBack}
        onExpired={onExpired}
      />,
    );
    expect(await screen.findByText(secondDetail.bodyText)).toBeVisible();
    expect(signal.aborted).toBe(true);
    await act(async () =>
      pending.resolve(
        json({
          status: "live",
          reason: "body_extracted",
          nextAttemptAt: 0,
          liveText: fullText,
        }),
      ),
    );
    expect(screen.getByText(secondDetail.bodyText)).toBeVisible();
    expect(screen.queryByText(lastSentence)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: second.title })).toBeVisible();
    expect(api).toHaveBeenCalledTimes(3);
  });
});
