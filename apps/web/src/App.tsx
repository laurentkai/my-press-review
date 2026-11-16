import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Layers3,
  LockKeyhole,
  Newspaper,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import type {
  Article,
  Source,
  WorkspaceSection,
} from "../../../packages/shared/types";
import { demoArticles, demoSources, filterArticles, parseSource } from "./demo";

const themes = ["Tous les thèmes", "Politique", "Environnement", "Technologie"];
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-BE", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  }).format(new Date(value));

function ArticleCard({
  article,
  source,
  lead,
  onOpen,
}: {
  article: Article;
  source: Source;
  lead: boolean;
  onOpen: () => void;
}) {
  return (
    <article className={`article-card ${lead ? "lead" : ""}`}>
      <div className="article-meta">
        <span>{article.theme}</span>
        <span>{article.readingMinutes} min de lecture</span>
      </div>
      {lead && (
        <div className="editorial-art" aria-hidden="true">
          <span className="art-caption">LE DOSSIER</span>
          <div className="paper-sheet sheet-one" />
          <div className="paper-sheet sheet-two" />
          <span className="art-number">01</span>
          <span className="art-topic">
            Croiser
            <br />
            les regards.
          </span>
        </div>
      )}
      <p className="subject-label">{article.subject}</p>
      <h3>
        <button className="headline-button" onClick={onOpen}>
          {article.title}
        </button>
      </h3>
      <p className="article-excerpt">{article.excerpt}</p>
      <div className="article-bottom">
        <span className="source-name">
          <span className="source-mark" aria-hidden="true">
            {source.name[0]}
          </span>
          {source.name}
        </span>
        <button
          className="icon-button"
          onClick={onOpen}
          aria-label={`Lire : ${article.title}`}
        >
          <ArrowRight size={18} />
        </button>
      </div>
      <time className="article-date" dateTime={article.publishedAt}>
        {formatDate(article.publishedAt)}
      </time>
    </article>
  );
}

function SourcesPanel({
  sources,
  setSources,
}: {
  sources: Source[];
  setSources: (sources: Source[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <section className="sources-panel" aria-labelledby="sources-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VOTRE SÉLECTION</p>
          <h2 id="sources-title">Mes sources</h2>
          <p className="muted">Les perspectives qui composent votre revue.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
        >
          {adding ? <X size={16} /> : <Plus size={16} />}{" "}
          {adding ? "Fermer" : "Ajouter une source"}
        </button>
      </div>
      <p className="inline-note">
        Configuration de démonstration, conservée uniquement jusqu’au
        rechargement. Aucune URL n’est collectée.
      </p>
      {adding && (
        <form
          className="source-form"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = parseSource(name, url);
            if (!parsed) {
              setError(
                "Saisissez un nom de 1 à 120 caractères et une URL HTTP ou HTTPS sans identifiants.",
              );
              return;
            }
            if (sources.some((source) => source.url === parsed.url)) {
              setError("Cette URL est déjà dans votre sélection.");
              return;
            }
            setSources([
              ...sources,
              { id: crypto.randomUUID(), ...parsed, enabled: true },
            ]);
            setName("");
            setUrl("");
            setError("");
            setAdding(false);
            setNotice(
              "Source ajoutée à la démonstration. Aucun article ne sera téléchargé.",
            );
          }}
        >
          <label>
            Nom du média
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Mon journal"
            />
          </label>
          <label>
            Adresse du flux
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemple.fr/rss"
            />
          </label>
          <button className="primary-button" type="submit">
            Ajouter à la démo
          </button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </form>
      )}
      <p role="status" className="muted">
        {notice}
      </p>
      <div className="source-list">
        {sources.map((source) => (
          <div className="source-row" key={source.id}>
            <span className="source-avatar" aria-hidden="true">
              <Globe2 size={20} />
            </span>
            <div className="source-info">
              <h3>{source.name}</h3>
              <p>{source.url}</p>
            </div>
            <button
              className={`toggle-button ${source.enabled ? "enabled" : ""}`}
              aria-pressed={source.enabled}
              aria-label={`${source.enabled ? "Désactiver" : "Activer"} ${source.name}`}
              onClick={() =>
                setSources(
                  sources.map((s) =>
                    s.id === source.id ? { ...s, enabled: !s.enabled } : s,
                  ),
                )
              }
            >
              {source.enabled ? <Check size={15} /> : <Plus size={15} />}{" "}
              {source.enabled ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function App() {
  const [section, setSection] = useState<WorkspaceSection>("edition");
  const [theme, setTheme] = useState("Tous les thèmes");
  const [subject, setSubject] = useState("Tous les sujets");
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState(demoSources);
  const [selected, setSelected] = useState<Article | null>(null);
  const [login, setLogin] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "disabled" | "error">(
    "loading",
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!login) return;
    const abort = new AbortController();
    setAuthState("loading");
    fetch("/api/auth/providers", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unavailable");
        return response.json();
      })
      .then(() => setAuthState("disabled"))
      .catch(() => {
        if (!abort.signal.aborted) setAuthState("error");
      });
    return () => abort.abort();
  }, [login]);
  useEffect(() => {
    if (selected) headingRef.current?.focus();
  }, [selected]);
  const visible = filterArticles(demoArticles, sources, theme, subject, query);
  const subjects = [
    ...new Set(
      demoArticles
        .filter((a) => theme === "Tous les thèmes" || a.theme === theme)
        .map((a) => a.subject),
    ),
  ];
  function navigate(next: WorkspaceSection) {
    setSection(next);
    setSelected(null);
    setLogin(false);
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation principale">
        <a href="/" className="brand" aria-label="La Revue — accueil">
          <span className="brand-icon">
            <Newspaper size={24} />
          </span>
          <span>
            la revue<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="brand-baseline">L’actualité, à votre mesure.</p>
        <div className="workspace-badge">
          <span className="workspace-monogram">LR</span>
          <div>
            <strong>Espace de démonstration</strong>
            <span>Votre revue personnelle</span>
          </div>
        </div>
        <p className="nav-label">MA BIBLIOTHÈQUE</p>
        <nav>
          {(
            [
              { id: "edition", label: "Ma revue", Icon: BookOpen },
              { id: "sources", label: "Mes sources", Icon: Globe2 },
              { id: "settings", label: "Administration", Icon: Settings2 },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-button ${section === id && !login ? "active" : ""}`}
              aria-current={section === id && !login ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === "edition" && (
                <span className="nav-count">
                  {
                    filterArticles(
                      demoArticles,
                      sources,
                      "Tous les thèmes",
                      "Tous les sujets",
                      "",
                    ).length
                  }
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-topics">
          <p className="nav-label">MES THÈMES</p>
          {themes.slice(1).map((item) => (
            <button
              className={`topic-button ${theme === item && section === "edition" && !login ? "chosen" : ""}`}
              key={item}
              onClick={() => {
                navigate("edition");
                setTheme(item);
                setSubject("Tous les sujets");
              }}
            >
              <span className="topic-dot" />
              {item}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <div className="sidebar-foot">
          <div className="private-label">
            <LockKeyhole size={14} /> Un espace privé, pour vous
          </div>
          <button
            className="profile-button"
            onClick={() => {
              setLogin(true);
              setSelected(null);
            }}
          >
            <span className="profile-avatar">?</span>
            <span>
              <strong>Se connecter</strong>
              <small>Microsoft ou Apple</small>
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <span className="topbar-label">VOTRE ESPACE</span>{" "}
            <ChevronRight size={13} />{" "}
            {login
              ? "Connexion"
              : section === "edition"
                ? "Ma revue"
                : section === "sources"
                  ? "Mes sources"
                  : "Administration"}
          </span>
          <span className="edition-tag">ÉDITION DÉCOUVERTE</span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="demo-banner">
            <span>
              <span className="demo-dot" /> Démonstration · contenus fictifs,
              aucune actualité collectée
            </span>
            <button onClick={() => setLogin(true)}>
              Connexion privée <ArrowRight size={14} />
            </button>
          </div>
          {login ? (
            <section className="login-panel" aria-labelledby="login-title">
              <span className="login-symbol">
                <LockKeyhole size={28} />
              </span>
              <p className="eyebrow">VOTRE REVUE, VOTRE ESPACE</p>
              <h1 id="login-title">Retrouvez vos perspectives.</h1>
              <p>
                Vos médias, vos thèmes et votre sélection dans un espace
                personnel.
              </p>
              <div className="login-options">
                <button className="provider-button" disabled>
                  Continuer avec Microsoft / Hotmail
                </button>
                <button className="provider-button" disabled>
                  Continuer avec Apple
                </button>
              </div>
              <p role="status" className="inline-note">
                {authState === "loading"
                  ? "Vérification de la configuration…"
                  : authState === "error"
                    ? "Le service de connexion est indisponible. Aucun accès privé n’est ouvert."
                    : "La connexion sera disponible après configuration des fournisseurs OAuth. Aucun compte n’est créé dans cette version."}
              </p>
              <button className="text-button" onClick={() => setLogin(false)}>
                <ArrowLeft size={16} /> Retour à la démonstration
              </button>
            </section>
          ) : section === "sources" ? (
            <SourcesPanel sources={sources} setSources={setSources} />
          ) : section === "settings" ? (
            <section className="settings-panel">
              <p className="eyebrow">CONFIGURATION GLOBALE</p>
              <h1>Administration</h1>
              <div className="locked-panel">
                <LockKeyhole size={28} />
                <h2>Un accès réservé au Super Admin.</h2>
                <p>
                  La gestion des utilisateurs, des fournisseurs de connexion et
                  des paramètres IA sera accessible après authentification et
                  vérification du rôle côté serveur.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setLogin(true)}
                >
                  Voir la connexion <ArrowRight size={16} />
                </button>
              </div>
              <div className="configuration-summary">
                <div>
                  <Clock3 size={20} />
                  <h3>Collecte planifiée</h3>
                  <p>
                    Cadence prévue : toutes les 15 minutes. Collecte non
                    activée.
                  </p>
                </div>
                <div>
                  <Layers3 size={20} />
                  <h3>Classement par IA</h3>
                  <p>
                    Organisation par thème et sujet. Fournisseur à configurer.
                  </p>
                </div>
              </div>
            </section>
          ) : selected ? (
            <section className="reading-view">
              <button className="text-button" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} /> Retour à ma revue
              </button>
              <p className="eyebrow">
                {selected.theme} / {selected.subject}
              </p>
              <h1 ref={headingRef} tabIndex={-1}>
                {selected.title}
              </h1>
              <div className="reading-meta">
                <span>
                  {sources.find((s) => s.id === selected.sourceId)?.name}
                </span>
                <time dateTime={selected.publishedAt}>
                  {formatDate(selected.publishedAt)}
                </time>
                <span>{selected.readingMinutes} min</span>
              </div>
              <p className="reading-intro">{selected.excerpt}</p>
              <div className="reading-body">
                {selected.body.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
              <div className="inline-note">
                Article fictif : aucune publication originale n’est associée à
                cette démonstration.
              </div>
            </section>
          ) : (
            <>
              <section className="edition-heading">
                <div>
                  <p className="eyebrow">PRENDRE LE TEMPS DE COMPRENDRE</p>
                  <h1>
                    Votre regard sur l’actualité<span>.</span>
                  </h1>
                  <p className="edition-description">
                    Vos sources choisies. Les sujets qui comptent. Plusieurs
                    perspectives.
                  </p>
                </div>
                <div className="edition-seal" aria-hidden="true">
                  <span>LA REVUE</span>
                  <Newspaper size={28} />
                  <span>PERSONNELLE</span>
                </div>
              </section>
              <div className="edition-rule">
                <span>LA SÉLECTION DE DÉMONSTRATION</span>
                <span>
                  {sources.filter((s) => s.enabled).length} sources actives{" "}
                  <span className="rule-separator">/</span> {visible.length}{" "}
                  articles fictifs
                </span>
              </div>
              <div
                className="theme-tabs"
                role="group"
                aria-label="Filtrer par thème"
              >
                {themes.map((item) => (
                  <button
                    key={item}
                    aria-pressed={theme === item}
                    className={theme === item ? "selected" : ""}
                    onClick={() => {
                      setTheme(item);
                      setSubject("Tous les sujets");
                    }}
                  >
                    {item}
                    {item === "Tous les thèmes" && (
                      <span>
                        {
                          filterArticles(
                            demoArticles,
                            sources,
                            item,
                            "Tous les sujets",
                            "",
                          ).length
                        }
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="filter-bar">
                <label className="search-field">
                  <Search size={17} />
                  <span className="sr-only">Rechercher dans la sélection</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un article, un sujet…"
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="Effacer la recherche"
                      onClick={() => setQuery("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <label className="subject-select">
                  <span className="sr-only">Filtrer par sujet</span>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option>Tous les sujets</option>
                    {subjects.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ArrowDown size={14} aria-hidden="true" />
                </label>
              </div>
              <p className="sr-only" role="status">
                {visible.length} articles affichés
              </p>
              {visible.length ? (
                <div className="article-grid">
                  {visible.map((article, index) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      source={sources.find((s) => s.id === article.sourceId)!}
                      lead={index === 0}
                      onOpen={() => setSelected(article)}
                    />
                  ))}
                </div>
              ) : (
                <section className="empty-state">
                  <Search size={28} />
                  <h2>Aucun article dans cette sélection.</h2>
                  <p>Essayez un autre sujet ou réactivez vos sources.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTheme("Tous les thèmes");
                      setSubject("Tous les sujets");
                      setQuery("");
                    }}
                  >
                    Réinitialiser les filtres <ArrowRight size={16} />
                  </button>
                </section>
              )}
              <div className="edition-end">
                <span /> <Newspaper size={18} /> <span />
              </div>
              <p className="edition-end-label">
                Vous avez parcouru votre sélection.
              </p>
            </>
          )}
          <footer className="page-footer">
            <span>
              la revue. <span>Une autre façon de s’informer.</span>
            </span>
            <span>Sources citées. Perspectives croisées.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
