// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractArticle } from "../apps/worker/feeds/article-extractor";

const paragraph =
  "Cette phrase synthétique explique les mesures et leurs conséquences pour les habitants. "
    .repeat(6)
    .trim();
const text = `${paragraph}\n\nSeconde partie : ${paragraph}`;
const body = `<p>${paragraph}</p><p>Seconde partie : ${paragraph}</p>`;
const ld = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`;
const article = (extra: Record<string, unknown> = {}) => ({
  "@type": "NewsArticle",
  isAccessibleForFree: "True",
  articleBody: text,
  ...extra,
});
const dom = (content = body) =>
  `<div id="article-text" class="ap-Story-content"><div id="story-preview-FREE"></div><div id="piano-paywall-FREE"><div id="story-content-FREE">${content}</div></div></div>`;
const page = (content = body, extra = "", metadata = article()) =>
  dom(content) + ld(metadata) + extra;
const gouv = (content = body) =>
  `<main id="main"><div class="cmp-text">${content}</div></main>`;

describe("extraction des structures validées sans réseau", () => {
  it.each(["dh", "lalibre"])(
    "extrait les paragraphes IPM %s avec preuve FREE",
    (source) => {
      expect(extractArticle(page(), source)).toEqual({
        status: "available",
        reason: "body_extracted",
        text,
        cacheable: true,
      });
    },
  );
  it.each([true, "true", "True", "TRUE", " true "])(
    "reconnaît le marqueur gratuit %s",
    (flag) => {
      expect(
        extractArticle(
          page(body, "", article({ isAccessibleForFree: flag })),
          "dh",
        ).status,
      ).toBe("available");
    },
  );
  it.each([false, "false", "False", "FALSE", " false "])(
    "refuse le marqueur payant %s",
    (flag) => {
      expect(
        extractArticle(
          page(body, "", article({ isAccessibleForFree: flag })),
          "dh",
        ),
      ).toMatchObject({ status: "restricted", text: "" });
    },
  );
  it("exige JSON-LD gratuit et corps DOM visible correspondant", () => {
    expect(extractArticle(dom(), "dh").status).toBe("unavailable");
    expect(extractArticle(ld(article()), "dh").status).toBe("unavailable");
    expect(
      extractArticle(
        page().replace('id="story-content-FREE"', 'id="story-content-OTHER"'),
        "dh",
      ).status,
    ).toBe("unavailable");
    expect(extractArticle(`<div hidden>${page()}</div>`, "dh").status).toBe(
      "unavailable",
    );
    expect(
      extractArticle(
        page(
          body,
          "",
          article({
            articleBody: "Sans relation avec les paragraphes visibles. ".repeat(
              25,
            ),
          }),
        ),
        "dh",
      ).reason,
    ).toBe("body_mismatch");
  });
  it("tolère ponctuation et quasi-doublons du même article", () => {
    expect(
      extractArticle(
        page(
          body,
          "",
          article({
            articleBody: text.replace(/ : /g, " ").replace(/\n/g, " "),
          }),
        ),
        "dh",
      ).text,
    ).toBe(text);
  });
  it("ignore menus, interstitiels, vidéos, publicité, scripts et légendes", () => {
    const noise =
      '<script class="paywall">alert(1)</script><style>secret</style><nav>Abonnez-vous pour lire cet article</nav><div class="advertisement">PUB</div><a class="ap-StoryInterstitialLink">À lire aussi : autre article</a><div class="ap-StoryVideo"><p>Vidéo recommandée</p></div><figcaption>Légende</figcaption><div hidden>Secret</div><iframe>secret</iframe>';
    expect(
      extractArticle(
        page(
          noise + body,
          "<nav>Abonnez-vous pour lire</nav><div>Abonnez-vous pour lire cet article</div>",
        ),
        "dh",
      ).text,
    ).toBe(text);
  });
  it.each([
    '<div class="paywall">Abonnez-vous</div>',
    '<div class="consent-wall">Acceptez pour continuer</div>',
  ])("une restriction visible prévaut sur le corps complet", (gate) => {
    expect(extractArticle(page(body, gate), "dh")).toMatchObject({
      status: "restricted",
      text: "",
    });
  });
  it("détecte une invitation à lire la suite dans le corps uniquement", () => {
    expect(
      extractArticle(
        page(body + "<p>Abonnez-vous pour lire la suite de cet article</p>"),
        "dh",
      ).status,
    ).toBe("unavailable");
  });
  it("refuse JSL hasPart payant même avec aperçu visible", () => {
    const metadata = article({
      isAccessibleForFree: true,
      hasPart: [{ isAccessibleForFree: "False" }],
    });
    expect(
      extractArticle(
        `<div class="articleBody">${body}</div>${ld({ "@graph": [metadata] })}`,
        "lejsl",
      ),
    ).toMatchObject({ status: "restricted", text: "" });
  });
  it("choisit le premier corps gouvernemental après le chapô sans contacts ni footer", () => {
    const html = `<div class="cmp-text">Hors main</div><main id="main"><div class="cmp-text"><p>${paragraph}</p></div><div class="cmp-text">${body}</div><div class="cmp-text"><p>Contact</p><p>Adresse</p></div></main><footer><div class="cmp-text">${body}</div></footer>`;
    expect(extractArticle(html, "gouvernement").text).toBe(text);
    expect(extractArticle(gouv(), "gouvernement").text).toBe(text);
  });
  it("interdit nosnippet et max-snippet zéro sans confondre les autres valeurs", () => {
    for (const policy of [
      "nosnippet",
      "max-snippet:0",
      "MAX-SNIPPET: 0, index",
    ]) {
      expect(
        extractArticle(
          page(body, `<meta name="robots" content="${policy}">`),
          "dh",
        ),
      ).toMatchObject({
        status: "unavailable",
        reason: "publisher_policy",
        text: "",
      });
    }
    expect(
      extractArticle(
        page(body, '<meta name="robots" content="max-snippet:100">'),
        "dh",
      ).status,
    ).toBe("available");
  });
  it("expose noarchive pour une lecture live sans stockage", () => {
    expect(
      extractArticle(
        page(body, '<meta name="robots" content="index, NOARCHIVE, follow">'),
        "dh",
      ),
    ).toMatchObject({ status: "available", cacheable: false });
    expect(
      extractArticle(
        page(body, '<meta name="description" content="noarchive">'),
        "dh",
      ).cacheable,
    ).toBe(true);
  });
  it("refuse les corps concurrents et plusieurs JSON-LD différents", () => {
    expect(extractArticle(page() + dom(), "dh").reason).toBe("ambiguous_body");
    expect(
      extractArticle(
        page() + ld(article({ articleBody: `Autre texte ${text}` })),
        "dh",
      ).reason,
    ).toBe("ambiguous_body");
  });
  it("accepte les doubles JSON-LD identiques", () => {
    expect(extractArticle(page() + ld(article()), "dh").status).toBe(
      "available",
    );
  });
  it("borne le texte sans troncature à 80000 caractères", () => {
    for (const length of [80_000, 80_001]) {
      const content = "a".repeat(length);
      const result = extractArticle(
        page(content, "", article({ articleBody: content })),
        "dh",
      );
      expect(result.status).toBe(
        length === 80_000 ? "available" : "unavailable",
      );
      expect(result.text.length).toBe(length === 80_000 ? length : 0);
    }
  });
  it.each(["…", "...", " Lire la suite"])(
    "refuse la troncature %s",
    (ending) => {
      const content = paragraph + ending;
      expect(
        extractArticle(
          page(content, "", article({ articleBody: content })),
          "dh",
        ).reason,
      ).toBe("incomplete_body");
    },
  );
  it("refuse les aperçus explicites, extraits courts, corps génériques et sources inconnues", () => {
    expect(
      extractArticle(
        page().replace(
          'class="ap-Story-content"',
          'class="ap-Story-content truncated"',
        ),
        "dh",
      ).reason,
    ).toBe("incomplete_body");
    expect(
      extractArticle(page("Bref", "", article({ articleBody: "Bref" })), "dh")
        .reason,
    ).toBe("body_too_short");
    expect(extractArticle(`<article>${body}</article>`, "dh").status).toBe(
      "unavailable",
    );
    expect(extractArticle(dom(), "7sur7").status).toBe("unavailable");
  });
  it("nettoie le HTML JSON-LD et décode les entités DOM", () => {
    expect(
      extractArticle(
        ld(
          article({
            articleBody: `<p>${paragraph}</p><script>evil()</script>`,
          }),
        ),
        "gouvernement",
      ).text,
    ).toBe(paragraph);
    expect(
      extractArticle(
        page(
          body.replace("Seconde", "Seconde &amp;"),
          "",
          article({ articleBody: text.replace("Seconde", "Seconde &") }),
        ),
        "dh",
      ).text,
    ).toContain("Seconde &");
  });
  it("ignore JSON invalide supplémentaire et borne taille/profondeur HTML", () => {
    expect(
      extractArticle(
        page() + '<script type="application/ld+json">{invalid}</script>',
        "dh",
      ).status,
    ).toBe("available");
    expect(extractArticle("a".repeat(2_000_001), "dh").reason).toBe(
      "html_too_large",
    );
    expect(
      extractArticle("<div>".repeat(130) + page() + "</div>".repeat(130), "dh")
        .reason,
    ).toBe("html_too_deep");
  });
});
