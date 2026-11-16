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
const fullTextMessages: Record<string, string> = {
  publisher_policy:
    "L’éditeur limite la récupération automatisée de ce contenu.",
  source_unverified:
    "La lecture complète n’est pas encore disponible pour cette source.",
  access_unverified:
    "Le caractère gratuit de cet article n’est pas confirmé par le flux.",
  robots_disallowed:
    "L’éditeur refuse la récupération automatique de cet article.",
  robots_unavailable:
    "Les règles de collecte de l’éditeur sont momentanément indisponibles.",
  blocked_403: "L’éditeur a refusé la récupération de cette page.",
  consent_required: "L’éditeur demande un consentement sur son site.",
  access_restricted: "L’éditeur réserve cet article à ses abonnés ou membres.",
  source_busy:
    "La récupération de cette source est déjà en cours ou attend son prochain créneau.",
  incomplete_body: "La page ne fournit qu’un aperçu identifiable de l’article.",
  body_too_short:
    "Le corps de l’article n’a pas pu être distingué d’un simple extrait.",
  too_large: "La page dépasse la limite de lecture du service.",
  timeout: "L’éditeur n’a pas répondu à temps.",
  rate_limited: "L’éditeur demande d’espacer les requêtes.",
};
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
  const [retrieving, setRetrieving] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setDetail(null);
    setError("");
    setRetrieving(false);
    const read = async () => {
      const response = await fetch(`/api/trial/articles/${article.id}`, {
        signal: abort.signal,
        cache: "no-store",
      });
      if (response.status === 401) {
        onExpired();
        return null;
      }
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? "Cet article n’est plus disponible dans votre revue."
            : "Impossible de charger la lecture.",
        );
      return (await response.json()) as TrialArticleDetail;
    };
    const load = async () => {
      const value = await read();
      if (!value || abort.signal.aborted) return;
      setDetail(value);
      const blocked = [
        "publisher_policy",
        "source_unverified",
        "access_unverified",
        "robots_disallowed",
        "access_restricted",
      ].includes(value.fullTextReason ?? "");
      if (
        !value.fullTextStatus ||
        value.contentKind === "article" ||
        value.accessLevel === "restricted" ||
        value.fullTextStatus === "restricted" ||
        blocked ||
        (value.fullTextNextAttemptAt ?? 0) > Date.now()
      )
        return;
      setRetrieving(true);
      try {
        const response = await fetch(
          `/api/trial/articles/${article.id}/content`,
          { method: "POST", signal: abort.signal, cache: "no-store" },
        );
        if (response.status === 401) {
          onExpired();
          return;
        }
        if (!response.ok)
          throw new Error("Impossible de récupérer l’article pour le moment.");
        const result = (await response.json()) as {
          liveText?: string;
          status: string;
          reason: string;
          nextAttemptAt: number;
        };
        if (abort.signal.aborted) return;
        if (result.liveText)
          setDetail({
            ...value,
            bodyText: result.liveText,
            contentKind: "article",
            fullTextStatus: "live",
            fullTextReason: result.reason,
            fullTextNextAttemptAt: result.nextAttemptAt,
          });
        else {
          const updated = await read();
          if (updated && !abort.signal.aborted)
            setDetail({
              ...updated,
              fullTextReason:
                result.reason === "source_busy"
                  ? result.reason
                  : updated.fullTextReason,
              fullTextNextAttemptAt: Math.max(
                updated.fullTextNextAttemptAt ?? 0,
                result.nextAttemptAt,
              ),
            });
        }
      } finally {
        if (!abort.signal.aborted) setRetrieving(false);
      }
    };
    load().catch((error: unknown) => {
      if (!abort.signal.aborted)
        setError(
          error instanceof Error ? error.message : "Lecture indisponible.",
        );
    });
    return () => abort.abort();
  }, [article.id, attempt, onExpired]);
  const current =
    detail?.fullTextStatus === "restricted"
      ? { ...detail, accessLevel: "restricted" as const }
      : (detail ?? article);
  const isArticle = detail?.contentKind === "article";
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
          {isArticle
            ? "Article en lecture"
            : current.accessLevel === "restricted"
              ? "Accès réservé chez l’éditeur"
              : "Extrait du flux"}
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
        {isArticle
          ? detail.fullTextStatus === "live"
            ? "Texte récupéré à la demande depuis la page de l’éditeur, sans archivage dans La Revue."
            : "Texte récupéré depuis la page originale. La mise en forme et les contenus interactifs restent disponibles chez l’éditeur."
          : current.accessLevel === "restricted"
            ? "L’éditeur réserve cet article à ses abonnés ou membres. Seul l’extrait du flux est présenté ici."
            : retrieving
              ? "Récupération du corps de l’article chez l’éditeur… L’extrait reste affiché pendant le chargement."
              : `${fullTextMessages[detail?.fullTextReason ?? ""] ?? "Le corps de l’article n’est pas disponible ici."} Seul l’extrait du flux est affiché ; il ne s’agit pas du texte intégral.`}
        {retrieving && <p role="status">Chargement de l’article…</p>}
        {!isArticle &&
        !retrieving &&
        detail?.fullTextNextAttemptAt &&
        detail.fullTextNextAttemptAt > Date.now() ? (
          <p>
            Prochaine tentative possible après{" "}
            {new Intl.DateTimeFormat("fr-BE", {
              timeStyle: "short",
              timeZone: "Europe/Brussels",
            }).format(new Date(detail.fullTextNextAttemptAt))}
            .
          </p>
        ) : null}
        {!isArticle &&
          !retrieving &&
          current.accessLevel !== "restricted" &&
          detail?.fullTextStatus &&
          ![
            "publisher_policy",
            "source_unverified",
            "access_unverified",
            "robots_disallowed",
            "access_restricted",
          ].includes(detail.fullTextReason ?? "") && (
            <button
              className="text-button"
              disabled={(detail.fullTextNextAttemptAt ?? 0) > Date.now()}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Rechercher le texte complet
            </button>
          )}
      </div>
      {error && (
        <div role="alert" className="inline-note form-error">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      )}
      {!detail ? (
        error ? null : (
          <p role="status" className="muted">
            Chargement du texte disponible…
          </p>
        )
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
