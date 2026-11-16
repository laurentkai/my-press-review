// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyArticle } from "../apps/worker/feeds/classify";
import { topics } from "../packages/shared/topics";

const article = (
  title: string,
  excerpt = "",
  url = "https://example.test/news/article",
) => ({ title, excerpt, url });

describe("classement déterministe des articles", () => {
  it("classe le sport belge par sujet, indépendamment du média", () => {
    expect(
      classifyArticle(
        {
          ...article("Les Diables rouges gagnent en Belgique"),
          categories: ["Belgique"],
        },
        "dh",
      ),
    ).toEqual({ theme: "Sport", subtheme: "Football" });
  });
  it.each([
    ["Élection présidentielle en France", "Politique", "Présidentielle"],
    ["Les élections législatives approchent", "Politique", "Élections"],
    ["Wall Street et le CAC 40 progressent", "Économie", "Marchés"],
    [
      "L’intelligence artificielle transforme les smartphones",
      "Sciences et technologies",
      "Technologie",
    ],
    [
      "Le réchauffement climatique menace la biodiversité",
      "Environnement",
      "Climat",
    ],
    ["Un nouveau vaccin contre le cancer", "Santé", "Médecine"],
    ["Un concert de musique", "Culture", "Musique"],
    ["Le tribunal rend son verdict", "Société", "Justice"],
    ["Un accord diplomatique à l’ONU", "International", "Diplomatie"],
  ])("classe %s", (title, theme, subtheme) => {
    expect(classifyArticle(article(title), "figaro")).toEqual({
      theme,
      subtheme,
    });
  });
  it("utilise les mots de l’extrait et normalise les accents décomposés", () => {
    expect(
      classifyArticle(
        article(
          "À découvrir",
          "Une e\u0301lection pre\u0301sidentielle approche",
        ),
        "lejsl",
      ),
    ).toEqual({ theme: "Politique", subtheme: "Présidentielle" });
  });
  it("donne priorité à la catégorie éditeur sur les mots du titre", () => {
    expect(
      classifyArticle(
        {
          ...article("Le gouvernement prépare une réforme"),
          categories: ["Sport", "Football"],
        },
        "lalibre",
      ),
    ).toEqual({ theme: "Sport", subtheme: "Football" });
  });
  it("reconnaît une rubrique URL et un sous-thème encodé", () => {
    expect(
      classifyArticle(
        article(
          "Une nouvelle annonce",
          "",
          "https://example.test/%C3%A9conomie/march%C3%A9s-financiers/123",
        ),
        "7sur7",
      ),
    ).toEqual({ theme: "Économie", subtheme: "Marchés" });
    expect(
      classifyArticle(
        article(
          "Le gouvernement réagit",
          "",
          "https://example.test/sport/football/123",
        ),
        "7sur7",
      ),
    ).toEqual({ theme: "Sport", subtheme: "Football" });
  });
  it.each([
    "La maison ouvre demain",
    "Le transport se modernise",
    "Une marche dans le quartier",
    "Le président du club prend la parole",
    "La culture des tomates reprend",
  ])("ne classe pas un mot ambigu ou une sous-chaîne : %s", (title) => {
    const result = classifyArticle(article(title), "dh");
    expect(result).toEqual({
      theme: "Autres",
      subtheme: null,
    });
  });
  it("ne déduit rien du domaine, des paramètres ou de la géographie", () => {
    expect(
      classifyArticle(
        {
          ...article(
            "Une annonce en France et en Belgique",
            "",
            "https://sport.example.test/article?category=football",
          ),
          categories: ["France", "Belgique", "Luxembourg"],
        },
        "dh",
      ),
    ).toEqual({ theme: "Autres", subtheme: null });
  });
  it.each([
    ["investing", "Économie", "Marchés"],
    ["zonebourse", "Économie", "Marchés"],
    ["gouvernement", "Politique", "Institutions"],
    ["unknown", "Autres", null],
  ])(
    "applique le repli %s uniquement sans signal",
    (source, theme, subtheme) => {
      expect(classifyArticle(article("Une annonce"), source)).toEqual({
        theme,
        subtheme,
      });
      expect(classifyArticle(article("Football en Belgique"), source)).toEqual({
        theme: "Sport",
        subtheme: "Football",
      });
    },
  );
  it("tolère les URL malformées sans accès réseau", () => {
    expect(
      classifyArticle(article("Sans information", "", "not a URL%"), "dh"),
    ).toEqual({ theme: "Autres", subtheme: null });
  });
  it("renvoie toujours un thème et un sous-thème de la taxonomie", () => {
    for (const topic of topics) {
      const input = { ...article("Annonce"), categories: [topic.name] };
      const result = classifyArticle(input, "unknown");
      expect(result.theme).toBe(topic.name);
      expect(
        result.subtheme === null ||
          (topic.subtopics as readonly string[]).includes(result.subtheme),
      ).toBe(true);
      expect(classifyArticle(input, "unknown")).toEqual(result);
    }
  });
});

describe("synonymes des rubriques et catégories éditeur", () => {
  const labels: [string, string, string | null][] = [
    ["monde", "International", null],
    ["international", "International", null],
    ["sports", "Sport", null],
    ["faits-divers", "Société", "Justice"],
    ["justice", "Société", "Justice"],
    ["people", "Culture", null],
    ["médias", "Culture", null],
    ["conjoncture", "Économie", null],
    ["finance", "Économie", null],
    ["transports", "Société", null],
    ["mobilité", "Société", null],
    ["tech-web", "Sciences et technologies", "Technologie"],
    ["Diables Rouges", "Sport", "Football"],
    ["economy", "Économie", null],
    ["economic-indicators", "Économie", null],
    ["stock-market-news", "Économie", "Marchés"],
    ["markets", "Économie", "Marchés"],
  ];
  it.each(labels)("classe la catégorie %s", (label, theme, subtheme) => {
    expect(
      classifyArticle({ ...article("Une annonce"), categories: [label] }, "dh"),
    ).toEqual({ theme, subtheme });
  });
  it.each(labels)("classe la rubrique %s", (label, theme, subtheme) => {
    expect(
      classifyArticle(
        article(
          "Une annonce",
          "",
          `https://example.test/news/${encodeURIComponent(label)}/article`,
        ),
        "7sur7",
      ),
    ).toEqual({ theme, subtheme });
  });
  it("affine finance en Marchés seulement en présence d’un signal précis", () => {
    expect(
      classifyArticle(
        { ...article("Le CAC 40 progresse"), categories: ["Finance"] },
        "investing",
      ),
    ).toEqual({ theme: "Économie", subtheme: "Marchés" });
    expect(
      classifyArticle(
        article(
          "Une annonce",
          "",
          "https://fr.investing.com/news/economy-news/annonce-123",
        ),
        "investing",
      ),
    ).toEqual({ theme: "Économie", subtheme: null });
  });
  it("donne aux synonymes de métadonnées priorité sur les mots du texte", () => {
    expect(
      classifyArticle(
        { ...article("Le gouvernement réagit"), categories: ["Sports"] },
        "dh",
      ),
    ).toEqual({ theme: "Sport", subtheme: null });
    expect(
      classifyArticle(
        article(
          "Le parlement débat",
          "",
          "https://example.test/people/annonce",
        ),
        "7sur7",
      ),
    ).toEqual({ theme: "Culture", subtheme: null });
  });
  it("ne laisse pas la géographie voler le football des Diables Rouges", () => {
    expect(
      classifyArticle(
        {
          ...article(
            "Une nouvelle annonce",
            "",
            "https://www.dhnet.be/belgique/article",
          ),
          categories: ["Belgique", "Diables Rouges"],
        },
        "dh",
      ),
    ).toEqual({ theme: "Sport", subtheme: "Football" });
  });
  it.each([
    "Le monde du football évolue",
    "Tout le monde arrive",
    "La mobilité des oiseaux",
    "Une plateforme multimedias",
    "Un fait diversement apprécié",
  ])("ne traite pas les alias comme mots-clés de prose : %s", (title) => {
    expect(classifyArticle(article(title), "dh")).toEqual({
      theme: title.includes("football") ? "Sport" : "Autres",
      subtheme: title.includes("football") ? "Football" : null,
    });
  });
  it("ignore les alias dans le domaine, la requête et le slug final", () => {
    expect(
      classifyArticle(
        article(
          "Une annonce",
          "",
          "https://finance.example.test/news/people?category=sports",
        ),
        "dh",
      ),
    ).toEqual({ theme: "Autres", subtheme: null });
  });
});
