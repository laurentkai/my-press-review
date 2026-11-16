import { topics } from "../../../packages/shared/topics";

type Classification = { theme: string; subtheme: string | null };
type Rule = Classification & { keywords: string[] };

// Ordered rules also define the stable tie-break for equally strong signals.
const rules: Rule[] = [
  {
    theme: "Politique",
    subtheme: "Présidentielle",
    keywords: ["presidentielle", "presidentielles"],
  },
  {
    theme: "Politique",
    subtheme: "Élections",
    keywords: [
      "election",
      "elections",
      "electoral",
      "electorale",
      "legislatives",
      "scrutin",
    ],
  },
  {
    theme: "Politique",
    subtheme: "Institutions",
    keywords: [
      "parlement",
      "gouvernement",
      "constitution",
      "assemblee nationale",
      "senat",
      "premier ministre",
    ],
  },
  {
    theme: "International",
    subtheme: "Diplomatie",
    keywords: ["diplomatie", "diplomatique", "ambassade", "onu"],
  },
  {
    theme: "International",
    subtheme: "Conflits",
    keywords: [
      "guerre",
      "cessez le feu",
      "conflit arme",
      "bombardement",
      "bombardements",
    ],
  },
  {
    theme: "Économie",
    subtheme: "Marchés",
    keywords: [
      "bourse",
      "bourses",
      "boursier",
      "boursiere",
      "cac 40",
      "wall street",
      "nasdaq",
      "marches financiers",
      "stock market",
    ],
  },
  {
    theme: "Économie",
    subtheme: "Entreprises",
    keywords: [
      "entreprise",
      "entreprises",
      "fusion acquisition",
      "chiffre d affaires",
    ],
  },
  {
    theme: "Économie",
    subtheme: "Emploi",
    keywords: ["emploi", "chomage", "recrutement", "licenciements"],
  },
  {
    theme: "Société",
    subtheme: "Justice",
    keywords: ["justice", "tribunal", "proces", "judiciaire"],
  },
  {
    theme: "Société",
    subtheme: "Éducation",
    keywords: ["education", "enseignement", "ecole", "universite"],
  },
  {
    theme: "Sport",
    subtheme: "Football",
    keywords: [
      "football",
      "foot",
      "ligue 1",
      "ligue des champions",
      "diables rouges",
      "jupiler pro league",
    ],
  },
  {
    theme: "Sport",
    subtheme: "Tennis",
    keywords: ["tennis", "roland garros", "wimbledon"],
  },
  {
    theme: "Sport",
    subtheme: "Cyclisme",
    keywords: ["cyclisme", "tour de france", "velo", "peloton"],
  },
  {
    theme: "Culture",
    subtheme: "Cinéma",
    keywords: ["cinema", "film", "films", "cineaste"],
  },
  {
    theme: "Culture",
    subtheme: "Musique",
    keywords: ["musique", "concert", "album", "chanteur", "chanteuse"],
  },
  {
    theme: "Culture",
    subtheme: "Littérature",
    keywords: ["litterature", "romancier", "prix goncourt"],
  },
  {
    theme: "Sciences et technologies",
    subtheme: "Technologie",
    keywords: [
      "technologie",
      "technologies",
      "tech",
      "high tech",
      "intelligence artificielle",
      "ia",
      "smartphone",
      "cybersecurite",
      "logiciel",
    ],
  },
  {
    theme: "Sciences et technologies",
    subtheme: "Sciences",
    keywords: [
      "science",
      "sciences",
      "spatial",
      "astronomie",
      "nasa",
      "physique quantique",
    ],
  },
  {
    theme: "Environnement",
    subtheme: "Climat",
    keywords: ["climat", "climatique", "rechauffement", "emissions de co2"],
  },
  {
    theme: "Environnement",
    subtheme: "Biodiversité",
    keywords: ["biodiversite", "especes menacees", "deforestation"],
  },
  {
    theme: "Environnement",
    subtheme: "Énergie",
    keywords: ["energies renouvelables", "eolien", "transition energetique"],
  },
  {
    theme: "Santé",
    subtheme: "Médecine",
    keywords: [
      "medecine",
      "cancer",
      "vaccin",
      "vaccins",
      "hopital",
      "traitement medical",
    ],
  },
  {
    theme: "Santé",
    subtheme: "Santé publique",
    keywords: ["sante publique", "epidemie", "pandemie"],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function contains(text: string, keyword: string): boolean {
  return ` ${text} `.includes(` ${keyword} `);
}
function pathSections(value: string): string[] {
  try {
    // Ignore host, query and the final article slug: only publisher sections are strong.
    return new URL(value).pathname
      .split("/")
      .filter(Boolean)
      .slice(0, -1)
      .map((part) => normalize(decodeURIComponent(part)));
  } catch {
    return [];
  }
}

// Compile invariant taxonomy/keywords once per isolate, rather than normalizing
// every keyword for every article on a constrained Worker.
const compiledTopics = topics
  .filter((topic) => topic.name !== "Autres")
  .map((topic) => ({
    name: topic.name,
    normalized: normalize(topic.name),
    rules: rules
      .filter((rule) => rule.theme === topic.name)
      .map((rule) => ({ ...rule, keywords: rule.keywords.map(normalize) })),
  }));

export function classifyArticle(
  input: { title: string; excerpt: string; url: string; categories?: string[] },
  sourceId: string,
): Classification {
  const categories = (input.categories ?? []).map(normalize);
  const sections = pathSections(input.url);
  const title = normalize(input.title);
  const excerpt = normalize(input.excerpt);
  let best: Classification | undefined;
  let bestScore = 0;
  for (const topic of compiledTopics) {
    const theme = topic.normalized;
    const topicRules = topic.rules;
    const categoryTheme = categories.some((value) => contains(value, theme));
    const sectionTheme = sections.some((value) => value === theme);
    const genericScore =
      (categoryTheme ? 100 : 0) +
      (sectionTheme ? 60 : 0) +
      (theme !== "culture" && contains(title, theme) ? 4 : 0) +
      (theme !== "culture" && contains(excerpt, theme) ? 1 : 0);
    let score = genericScore;
    let subtheme: string | null = null;
    let bestSubScore = 0;
    for (const rule of topicRules) {
      const ruleScore = rule.keywords.reduce(
        (sum, keyword) =>
          sum +
          (categories.some((value) => contains(value, keyword)) ? 100 : 0) +
          (sections.some((value) => contains(value, keyword)) ? 60 : 0) +
          (contains(title, keyword) ? 4 : 0) +
          (contains(excerpt, keyword) ? 1 : 0),
        0,
      );
      score += ruleScore;
      if (ruleScore > bestSubScore) {
        bestSubScore = ruleScore;
        subtheme = rule.subtheme;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = { theme: topic.name, subtheme };
    }
  }
  if (best) return best;
  if (sourceId === "investing" || sourceId === "zonebourse")
    return { theme: "Économie", subtheme: "Marchés" };
  if (sourceId === "gouvernement")
    return { theme: "Politique", subtheme: "Institutions" };
  return { theme: "Autres", subtheme: null };
}
