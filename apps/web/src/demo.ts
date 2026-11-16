import type { Article, Source } from "../../../packages/shared/types";

// Entirely fictional fixtures. No publisher article or personal data is bundled.
export const demoSources: Source[] = [
  {
    id: "journal",
    name: "Le Journal — démo",
    url: "https://example.com/journal",
    enabled: true,
  },
  {
    id: "eclaireur",
    name: "L’Éclaireur — démo",
    url: "https://example.com/eclaireur",
    enabled: true,
  },
  {
    id: "quotidien",
    name: "Le Quotidien — démo",
    url: "https://example.com/quotidien",
    enabled: true,
  },
];
const body = [
  "Cet article est un scénario fictif destiné à présenter le fonctionnement de votre future revue de presse. Il ne rapporte aucun événement réel et ne reproduit aucun contenu de média.",
  "Dans la version connectée, vous retrouverez ici le contenu original lorsque sa reproduction est autorisée, ou un extrait accompagné du lien vers la publication. La source et la date resteront toujours visibles.",
  "Le classement par thème et sujet vous permettra de croiser les perspectives de vos médias sélectionnés. Les éventuelles synthèses générées par IA seront identifiées séparément du contenu original.",
];
export const demoArticles: Article[] = [
  {
    id: "election",
    sourceId: "journal",
    theme: "Politique",
    subject: "Présidentielle française",
    title: "Présidentielle : les idées au cœur du débat",
    excerpt:
      "Un dossier de démonstration pour suivre les programmes, confronter les propositions et prendre le temps de comprendre.",
    publishedAt: "2026-11-16T08:30:00Z",
    readingMinutes: 5,
    body,
  },
  {
    id: "territoires",
    sourceId: "eclaireur",
    theme: "Politique",
    subject: "Présidentielle française",
    title: "Le regard des territoires sur la campagne",
    excerpt:
      "Autre angle, autre perspective : découvrez comment plusieurs sources peuvent enrichir un même sujet.",
    publishedAt: "2026-11-16T07:45:00Z",
    readingMinutes: 4,
    body,
  },
  {
    id: "energy",
    sourceId: "quotidien",
    theme: "Environnement",
    subject: "Transition énergétique",
    title: "Transition énergétique : comprendre les choix à venir",
    excerpt:
      "Rassembler les analyses pour éclairer les enjeux de la production, de la consommation et des usages.",
    publishedAt: "2026-11-16T07:00:00Z",
    readingMinutes: 6,
    body,
  },
  {
    id: "ai",
    sourceId: "journal",
    theme: "Technologie",
    subject: "Intelligence artificielle",
    title: "L’intelligence artificielle entre dans le quotidien",
    excerpt:
      "Une sélection fictive consacrée aux nouveaux usages et aux questions qu’ils soulèvent.",
    publishedAt: "2026-11-16T06:30:00Z",
    readingMinutes: 3,
    body,
  },
  {
    id: "europe",
    sourceId: "eclaireur",
    theme: "Politique",
    subject: "Europe",
    title: "L’Europe vue à travers plusieurs regards",
    excerpt:
      "Lire les points de vue côte à côte pour construire sa propre compréhension de l’actualité européenne.",
    publishedAt: "2026-11-15T16:00:00Z",
    readingMinutes: 4,
    body,
  },
  {
    id: "research",
    sourceId: "quotidien",
    theme: "Technologie",
    subject: "Intelligence artificielle",
    title: "Recherche et innovation : prendre du recul",
    excerpt:
      "Au-delà des annonces, un espace pour retrouver les analyses et les explications de fond.",
    publishedAt: "2026-11-15T12:00:00Z",
    readingMinutes: 7,
    body,
  },
];

export function filterArticles(
  articles: Article[],
  sources: Source[],
  theme: string,
  subject: string,
  query: string,
): Article[] {
  const enabled = new Set(
    sources.filter((source) => source.enabled).map((source) => source.id),
  );
  const search = query.trim().toLocaleLowerCase("fr");
  return articles.filter(
    (article) =>
      enabled.has(article.sourceId) &&
      (theme === "Tous les thèmes" || article.theme === theme) &&
      (subject === "Tous les sujets" || article.subject === subject) &&
      `${article.title} ${article.excerpt} ${article.subject}`
        .toLocaleLowerCase("fr")
        .includes(search),
  );
}

export function parseSource(
  name: string,
  url: string,
): { name: string; url: string } | null {
  try {
    const parsed = new URL(url.trim());
    if (
      !name.trim() ||
      name.trim().length > 120 ||
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return null;
    return { name: name.trim(), url: parsed.href };
  } catch {
    return null;
  }
}
