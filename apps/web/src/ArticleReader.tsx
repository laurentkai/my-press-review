import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type {
  TrialArticle,
  TrialArticleDetail,
  TrialSource,
} from "../../../packages/shared/types";

export function PublisherImage({
  article,
  reader = false,
}: {
  article: TrialArticle;
  reader?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [article.imageUrl]);
  if (!article.imageUrl || failed) return null;
  return (
    <figure
      className={reader ? "publisher-image reader-image" : "publisher-image"}
    >
      <img
        src={article.imageUrl}
        alt={reader ? "Illustration transmise par le média source" : ""}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {(reader || article.imageCredit) && (
        <figcaption>
          {article.imageCredit
            ? `Crédit : ${article.imageCredit}`
            : "Illustration du flux de l’éditeur"}
        </figcaption>
      )}
    </figure>
  );
}
export function ArticleReader({
  article,
  source,
  onBack,
  onExpired,
}: {
  article: TrialArticle;
  source: TrialSource;
  onBack: () => void;
  onExpired: () => void;
}) {
  const [detail, setDetail] = useState<TrialArticleDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setDetail(null);
    setError("");
    fetch(`/api/trial/articles/${article.id}`, {
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (abort.signal.aborted) return;
        if (response.status === 401) {
          onExpired();
          return;
        }
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Cet article n’est plus disponible dans votre revue."
              : "Impossible de charger la lecture.",
          );
        const value = (await response.json()) as TrialArticleDetail;
        if (!abort.signal.aborted) setDetail(value);
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Lecture indisponible.",
          );
      });
    return () => abort.abort();
  }, [article.id, attempt, onExpired]);
  const current = detail ?? article;
  const paragraphs = detail?.bodyText.split(/\n+/).filter(Boolean) ?? [];
  return (
    <article className="reading-view trial-reading">
      <button className="text-button reader-back" onClick={onBack}>
        <ArrowLeft size={16} /> Retour à ma revue
      </button>
      <p className="eyebrow">
        {current.theme}
        {current.subtheme ? ` / ${current.subtheme}` : ""}
      </p>
      <h1 tabIndex={-1}>{current.title}</h1>
      <div className="reading-meta">
        <span>{source.name}</span>
        <span>
          {current.publishedAt ? (
            <time dateTime={current.publishedAt}>
              {new Intl.DateTimeFormat("fr-BE", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Brussels",
              }).format(new Date(current.publishedAt))}
            </time>
          ) : (
            "Date de publication non précisée"
          )}
        </span>
        <span>
          {current.accessLevel === "restricted"
            ? "Accès réservé chez l’éditeur"
            : "Texte du flux original"}
        </span>
      </div>
      <a
        className="text-button reader-original"
        href={current.url}
        target="_blank"
        rel="noreferrer noopener"
      >
        Lire l’article original sur {source.name} <ArrowUpRight size={16} />
      </a>
      <PublisherImage article={current} reader />
      <div className="inline-note reader-disclosure">
        {current.accessLevel === "restricted"
          ? "L’éditeur réserve cet article à ses abonnés ou membres. Seul l’extrait du flux est présenté ici."
          : "Vous lisez le texte transmis par le flux de l’éditeur. Il peut être abrégé : ce n’est pas une garantie de texte intégral."}
      </div>
      {error ? (
        <div role="alert" className="inline-note form-error">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      ) : !detail ? (
        <p role="status" className="muted">
          Chargement du texte disponible…
        </p>
      ) : (
        <div className="reading-body">
          {paragraphs.length ? (
            paragraphs.map((text, index) => <p key={index}>{text}</p>)
          ) : detail.excerpt ? (
            <p>{detail.excerpt}</p>
          ) : (
            <p>
              Ce flux ne fournit pas de texte pour cette nouvelle. Retrouvez-la
              chez l’éditeur.
            </p>
          )}
        </div>
      )}
      {detail && detail.publisherCategories.length > 0 && (
        <p className="muted">
          Rubriques de l’éditeur : {detail.publisherCategories.join(" · ")}
        </p>
      )}
      <p className="muted">
        Classement automatique par règles, à titre indicatif. Aucun résumé
        généré par IA.
      </p>
      <a
        className="primary-button reader-original"
        href={current.url}
        target="_blank"
        rel="noreferrer noopener"
      >
        Continuer chez {source.name} <ArrowUpRight size={16} />
      </a>
    </article>
  );
}
