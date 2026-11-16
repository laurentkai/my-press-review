import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Globe2,
  LockKeyhole,
  LogOut,
  Newspaper,
  RefreshCw,
  Search,
} from "lucide-react";
import type { TrialWorkspace } from "../../../packages/shared/types";

const date = (value: string | number | null) =>
  value === null
    ? "Jamais"
    : new Intl.DateTimeFormat("fr-BE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Brussels",
      }).format(new Date(value));
const statusLabels: Record<string, string> = {
  pending: "Première collecte en attente",
  ok: "À jour",
  empty: "Flux reçu sans article utilisable",
  not_modified: "Aucune nouveauté",
  blocked_403: "Accès refusé par l’éditeur",
  consent_required: "Consentement requis par l’éditeur",
  not_found: "Flux introuvable",
  rate_limited: "Limite de requêtes atteinte",
  timeout: "Délai de réponse dépassé",
  too_large: "Flux trop volumineux",
  invalid_xml: "Réponse non reconnue comme flux",
  redirect_refused: "Redirection non autorisée",
  server_error: "Erreur du serveur source",
  network_error: "Collecte interrompue",
  too_many_items: "Flux dépassant les limites du test",
  unavailable: "Flux non disponible",
};

export function TrialLogin({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="trial-login"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage("");
        try {
          const response = await fetch("/api/trial/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          setCode("");
          if (response.ok) onSuccess();
          else
            setMessage(
              response.status === 429
                ? "Trop de tentatives. Réessayez dans dix minutes."
                : response.status === 503
                  ? "L’accès de test n’est pas encore configuré."
                  : "Code invalide ou connexion refusée.",
            );
        } catch {
          setMessage("Le service est indisponible. Réessayez.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Tester les sources réelles</h2>
      <p>
        Un espace privé partagé, protégé par un code temporaire. Il ne remplace
        pas les futurs comptes Microsoft et Apple.
      </p>
      <label>
        Code d’accès temporaire
        <input
          autoComplete="current-password"
          type="password"
          required
          maxLength={128}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <button className="primary-button" disabled={pending}>
        {pending ? "Connexion…" : "Ouvrir ma revue privée"}{" "}
        <ArrowRight size={16} />
      </button>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}

export function PrivateWorkspace({ onExit }: { onExit: () => void }) {
  const [data, setData] = useState<TrialWorkspace | null>(null);
  const [view, setView] = useState<"edition" | "sources">("edition");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes les catégories");
  const [sourceId, setSourceId] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const main = useRef<HTMLElement>(null);
  const exit = useRef(onExit);
  exit.current = onExit;
  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/trial/workspace", {
      signal,
      cache: "no-store",
    });
    if (response.status === 401) {
      setData(null);
      exit.current();
      return;
    }
    if (!response.ok)
      throw new Error("Impossible de charger la revue. Réessayez.");
    setData((await response.json()) as TrialWorkspace);
    setError("");
  }
  useEffect(() => {
    const abort = new AbortController();
    const reload = () => {
      load(abort.signal).catch(() => {
        if (!abort.signal.aborted)
          setError(
            "Impossible de charger la revue. Les données précédentes peuvent être anciennes.",
          );
      });
    };
    reload();
    const timer = setInterval(reload, 60_000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    main.current?.querySelector<HTMLHeadingElement>("h1")?.focus();
  }, [view]);
  async function update(path: string, method: string, body?: object) {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) {
      setData(null);
      exit.current();
      throw new Error("Session expirée.");
    }
    if (!response.ok)
      throw new Error("La modification a été refusée. Réessayez.");
    return response.json() as Promise<{ status?: string; processed?: boolean }>;
  }
  async function refresh() {
    if (!data) return;
    setBusy(true);
    setError("");
    setNotice("Collecte des sources arrivées à échéance…");
    try {
      for (const source of data.sources.filter(
        (entry) => entry.enabled && entry.feed,
      ))
        await update(`/api/trial/sources/${source.id}/refresh`, "POST");
      await load();
      setNotice(
        "Vérification terminée. Consultez les états par source ; les flux déjà récents ne sont pas sollicités à nouveau.",
      );
    } catch {
      setError(
        "La vérification n’a pas pu être terminée. Les résultats déjà reçus sont conservés.",
      );
    } finally {
      setBusy(false);
    }
  }
  const sources = data?.sources ?? [];
  const allArticles = data?.articles ?? [];
  const articles = allArticles.filter((article) => {
    const source = sources.find((entry) => entry.id === article.sourceId);
    return (
      (sourceId === "all" || article.sourceId === sourceId) &&
      (category === "Toutes les catégories" || source?.category === category) &&
      `${article.title} ${article.excerpt}`
        .toLocaleLowerCase("fr")
        .includes(query.trim().toLocaleLowerCase("fr"))
    );
  });
  return (
    <div className="app-shell">
      <a href="#trial-main" className="skip-link">
        Aller au contenu privé
      </a>
      <aside className="sidebar" aria-label="Navigation de la revue privée">
        <button className="brand" onClick={() => setView("edition")}>
          <Newspaper size={24} />
          <span>
            la revue<span className="brand-dot">.</span>
          </span>
        </button>
        <p className="brand-baseline">Vos sources, en prise directe.</p>
        <div className="workspace-badge">
          <LockKeyhole size={20} />
          <div>
            <strong>Espace de test privé</strong>
            <span>Session temporaire · 8 heures</span>
          </div>
        </div>
        <nav>
          <button
            className={`nav-button ${view === "edition" ? "active" : ""}`}
            onClick={() => setView("edition")}
          >
            <BookOpen size={18} />
            Ma revue
          </button>
          <button
            className={`nav-button ${view === "sources" ? "active" : ""}`}
            onClick={() => setView("sources")}
          >
            <Globe2 size={18} />
            Mes sources
          </button>
          <button
            className="nav-button"
            onClick={async () => {
              setBusy(true);
              try {
                await update("/api/trial/logout", "POST");
                setData(null);
                onExit();
              } catch {
                setError("La déconnexion a échoué. Réessayez.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </nav>
        <div className="sidebar-foot">
          <p className="private-label">
            <LockKeyhole size={14} /> Données absentes des fichiers publics
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>REVUE PERSONNELLE</span>
          <span className="edition-tag">ACCÈS PRIVÉ TEMPORAIRE</span>
        </header>
        <main ref={main} id="trial-main" tabIndex={-1}>
          <div className="demo-banner">
            <span>
              <LockKeyhole size={14} /> Sources réelles · accès par code · aucun
              résumé IA
            </span>
            <span>
              <Clock3 size={14} /> Cadence cible : 15 min par flux
            </span>
          </div>
          <section className="section-heading">
            <div>
              <p className="eyebrow">LES PERSPECTIVES QUE VOUS AVEZ CHOISIES</p>
              <h1 tabIndex={-1}>
                {view === "edition"
                  ? "Votre revue, en direct."
                  : "Mes sources réelles"}
              </h1>
              <p className="muted">
                {view === "edition"
                  ? "Titres et extraits des flux, avec un lien vers chaque publication."
                  : "Neuf médias sélectionnés. Chaque état reflète le dernier essai de collecte."}
              </p>
            </div>
            <button
              className="primary-button"
              onClick={refresh}
              disabled={busy || !data}
            >
              <RefreshCw size={16} />
              {busy ? "Vérification…" : "Vérifier les nouveautés"}
            </button>
          </section>
          {error && (
            <div className="inline-note form-error" role="alert">
              {error}{" "}
              <button
                className="text-button"
                onClick={() => {
                  load().catch(() => setError("Service indisponible."));
                }}
              >
                Réessayer
              </button>
            </div>
          )}
          {notice && (
            <p className="inline-note" role="status">
              {notice}
            </p>
          )}
          {!data && !error && (
            <p role="status" className="inline-note">
              Chargement de votre sélection…
            </p>
          )}
          {view === "sources" ? (
            <>
              <p className="inline-note">
                Les sources bloquées restent visibles sans être contournées. Les
                catégories sont proposées pour ce test. Aucun nouvel URL libre
                n’est collecté.
              </p>
              <div className="trial-source-list">
                {sources.map((source) => (
                  <article className="trial-source" key={source.id}>
                    <div className="source-title">
                      <h2>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {source.name}
                        </a>
                      </h2>
                      <span>{source.category}</span>
                    </div>
                    <p
                      className={`collection-status ${["blocked_403", "consent_required"].includes(source.status) ? "warning" : ""}`}
                    >
                      {statusLabels[source.status] ?? "État inconnu"}
                    </p>
                    <dl>
                      <div>
                        <dt>Dernier essai</dt>
                        <dd>{date(source.lastAttemptAt)}</dd>
                      </div>
                      <div>
                        <dt>Dernier succès</dt>
                        <dd>{date(source.lastSuccessAt)}</dd>
                      </div>
                      <div>
                        <dt>Articles conservés</dt>
                        <dd>{source.articleCount}</dd>
                      </div>
                    </dl>
                    <p className="muted">
                      {source.feed
                        ? "Flux RSS · intervalle minimum 15 minutes"
                        : "Aucun flux utilisable vérifié. Source désactivée."}
                    </p>
                    <button
                      className={`toggle-button ${source.enabled ? "enabled" : ""}`}
                      aria-pressed={source.enabled}
                      disabled={busy || !source.feed}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await update(
                            `/api/trial/sources/${source.id}`,
                            "PUT",
                            { enabled: !source.enabled },
                          );
                          await load();
                        } catch {
                          setError("Impossible de modifier cette source.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {source.enabled ? "Mettre en pause" : "Activer"}{" "}
                      {source.name}
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            data && (
              <>
                <div
                  className="theme-tabs"
                  role="group"
                  aria-label="Filtrer par catégorie"
                >
                  {[
                    "Toutes les catégories",
                    ...new Set(sources.map((s) => s.category)),
                  ].map((item) => (
                    <button
                      key={item}
                      className={category === item ? "selected" : ""}
                      aria-pressed={category === item}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="filter-bar">
                  <label className="search-field">
                    <Search size={17} />
                    <span className="sr-only">
                      Rechercher les articles réels
                    </span>
                    <input
                      placeholder="Rechercher dans votre revue…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <label className="subject-select">
                    <span className="sr-only">Filtrer par média</span>
                    <select
                      value={sourceId}
                      onChange={(event) => setSourceId(event.target.value)}
                    >
                      <option value="all">Tous les médias</option>
                      {sources.map((source) => (
                        <option value={source.id} key={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="trial-selection-count" role="status">
                  {articles.length} articles affichés · jusqu’à 20 derniers
                  articles par source active
                </p>
                {articles.length ? (
                  <div className="article-grid trial-grid">
                    {articles.map((article) => {
                      const source = sources.find(
                        (entry) => entry.id === article.sourceId,
                      )!;
                      return (
                        <article className="article-card" key={article.id}>
                          <div className="article-meta">
                            <span>{source.category}</span>
                            <span>Flux original</span>
                          </div>
                          <h2>
                            <a
                              className="headline-button"
                              href={article.url}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              {article.title}
                            </a>
                          </h2>
                          {article.excerpt && (
                            <p className="article-excerpt">{article.excerpt}</p>
                          )}
                          <div className="article-bottom">
                            <span className="source-name">{source.name}</span>
                            <a
                              className="text-button"
                              href={article.url}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              Lire l’original <ArrowRight size={14} />
                            </a>
                          </div>
                          <p className="article-date">
                            {article.publishedAt
                              ? `Publié le ${date(article.publishedAt)}`
                              : "Date de publication non précisée par le flux"}
                            <br />
                            Collecté le {date(article.collectedAt)}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <section className="empty-state">
                    <Newspaper size={28} />
                    <h2>La revue attend ses premiers articles.</h2>
                    <p>
                      Vérifiez les nouveautés ou ajustez les filtres. Les
                      erreurs éventuelles sont visibles dans Mes sources.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setView("sources")}
                    >
                      Voir les états des sources <ArrowRight size={14} />
                    </button>
                  </section>
                )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>
              la revue. <span>Sources citées. Accès privé.</span>
            </span>
            <span>Le texte intégral se lit chez l’éditeur.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
