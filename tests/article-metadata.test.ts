// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFeed } from "../apps/worker/feeds/parser";
import { trialCatalog, type FeedSource } from "../apps/worker/feeds/catalog";
import { collectSource } from "../apps/worker/feeds/collector";
import { memoryD1 } from "./d1";

const source = trialCatalog[1];
const rss = (items: string) => `<rss><channel>${items}</channel></rss>`;
function item(extra = "", selected: FeedSource = source) {
  return `<item><title>Une annonce</title><link>${selected.url}news/article</link>${extra}</item>`;
}
const parse = (extra: string) => parseFeed(rss(item(extra)), source)[0];
const databases: ReturnType<typeof memoryD1>[] = [];
afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

describe("métadonnées de lecture RSS et Atom", () => {
  it("conserve les paragraphes nettoyés de description, sans content:encoded", () => {
    const result = parse(
      `<description><![CDATA[<p>Premier &amp; texte.</p><p>Second <b>paragraphe</b>.</p><script>alert('interdit')</script><style>body{display:none}</style><iframe>secret</iframe><svg>dessin</svg><img src=x onerror=alert(1)>]]></description><content:encoded><![CDATA[Texte intégral interdit]]></content:encoded>`,
    );
    expect(result.bodyText).toBe("Premier & texte.\n\nSecond paragraphe .");
    expect(result.bodyText).not.toMatch(
      /<|>|alert|secret|dessin|intégral|display/,
    );
    expect(result.excerpt).toContain("Premier & texte.");
  });
  it("borne le corps à 2000 caractères et l’extrait à 300", () => {
    const result = parse(`<description>${"a".repeat(2500)}</description>`);
    expect(result.bodyText).toBe("a".repeat(2000));
    expect(result.excerpt).toBe("a".repeat(300));
  });
  it("ignore content:encoded quand aucune description n’est présente", () => {
    expect(
      parse("<content:encoded>Texte intégral</content:encoded>"),
    ).toMatchObject({
      bodyText: "",
      excerpt: "",
      imageUrl: null,
      imageCredit: "",
      accessLevel: "unknown",
      categories: [],
    });
  });
  it("lit summary et les catégories term dans Atom", () => {
    const result = parseFeed(
      `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Article Atom</title><link rel="alternate" href="${source.url}news/atom"/><summary type="html">&lt;p&gt;Premier&lt;/p&gt;&lt;p&gt;Second&lt;/p&gt;</summary><category term="Sport"/><category term="Football"/><dcterms:accessRights>FREE</dcterms:accessRights></entry></feed>`,
      source,
    )[0];
    expect(result).toMatchObject({
      bodyText: "Premier\n\nSecond",
      categories: ["Sport", "Football"],
      accessLevel: "free",
    });
  });
  it.each([
    ["FREE", "free", "Description autorisée"],
    ["PAYING", "restricted", ""],
    ["MEMBER", "restricted", ""],
    ["OTHER", "unknown", "Description autorisée"],
  ])(
    "interprète accessRights %s sans supprimer titre et extrait",
    (rights, level, body) => {
      expect(
        parse(
          `<description>Description autorisée</description><dcterms:accessRights>${rights}</dcterms:accessRights>`,
        ),
      ).toMatchObject({
        title: "Une annonce",
        excerpt: "Description autorisée",
        accessLevel: level,
        bodyText: body,
      });
    },
  );
  it("filtre dpp:paid même avec des droits FREE", () => {
    expect(
      parseFeed(
        rss(
          item(
            "<dpp:paid> true </dpp:paid><dcterms:accessRights>FREE</dcterms:accessRights>",
          ),
        ),
        source,
      ),
    ).toEqual([]);
  });
  it("collecte et nettoie les catégories éditeur", () => {
    expect(
      parse(
        "<category>Sport</category><category><![CDATA[<b>Football</b>]]></category><category> </category>",
      ).categories,
    ).toEqual(["Sport", "Football"]);
  });
});

describe("images des sources originales", () => {
  it.each([
    ["7sur7", "images.7sur7.be"],
    ["dh", "www.dhnet.be"],
    ["lalibre", "www.lalibre.be"],
    ["figaro", "i.f1g.fr"],
    ["investing", "content-media.investing.com"],
  ])("accepte le CDN autorisé de %s", (id, host) => {
    const selected = trialCatalog.find((entry) => entry.id === id)!;
    expect(
      parseFeed(
        rss(
          item(
            `<media:content url="https://${host}/photo.jpg" type="image/jpeg" medium="image"/>`,
            selected,
          ),
        ),
        selected,
      )[0].imageUrl,
    ).toBe(`https://${host}/photo.jpg`);
  });
  it("préfère content à thumbnail puis enclosure indépendamment de l’ordre", () => {
    const enclosure =
      '<enclosure url="https://www.dhnet.be/enclosure.jpg" type="image/jpeg"/>';
    const thumbnail = '<media:thumbnail url="https://www.dhnet.be/thumb.jpg"/>';
    const content =
      '<media:content url="https://www.dhnet.be/content.jpg" type="image/jpeg"/>';
    expect(parse(enclosure + thumbnail + content).imageUrl).toBe(
      "https://www.dhnet.be/content.jpg",
    );
    expect(parse(enclosure + thumbnail).imageUrl).toBe(
      "https://www.dhnet.be/thumb.jpg",
    );
    expect(parse(enclosure).imageUrl).toBe(
      "https://www.dhnet.be/enclosure.jpg",
    );
  });
  it.each([
    "http://www.dhnet.be/photo.jpg",
    "https://www.dhnet.be:8443/photo.jpg",
    "https://user:password@www.dhnet.be/photo.jpg",
    "https://attacker.test/photo.jpg",
    "https://www.dhnet.be.attacker.test/photo.jpg",
    "https://127.0.0.1/photo.jpg",
    "javascript:alert(1)",
  ])("rejette l’URL image %s", (url) => {
    expect(
      parse(`<media:content url="${url}" type="image/jpeg"/>`).imageUrl,
    ).toBeNull();
  });
  it("rejette les vidéos et enclosure sans type image, puis utilise thumbnail", () => {
    const result = parse(
      '<media:content url="https://www.dhnet.be/video.mp4" type="video/mp4"/><media:content url="https://www.dhnet.be/movie.jpg" medium="video"/><enclosure url="https://www.dhnet.be/untyped.jpg"/><enclosure url="https://www.dhnet.be/audio.mp3" type="audio/mpeg"/><media:thumbnail url="https://www.dhnet.be/thumb.jpg"/>',
    );
    expect(result.imageUrl).toBe("https://www.dhnet.be/thumb.jpg");
  });
  it.each([false, true])(
    "lit le crédit direct ou dans media:group (%s)",
    (grouped) => {
      const content =
        '<media:content url="https://www.dhnet.be/photo.jpg" medium="image"/><media:credit><![CDATA[<b>Agence</b> &amp; Auteur]]></media:credit>';
      expect(
        parse(grouped ? `<media:group>${content}</media:group>` : content),
      ).toMatchObject({
        imageUrl: "https://www.dhnet.be/photo.jpg",
        imageCredit: "Agence & Auteur",
      });
    },
  );
});

describe("persistance des métadonnées et reclassement à la collecte", () => {
  it("applique les valeurs par défaut de migration aux articles sans métadonnées", () => {
    const database = memoryD1();
    databases.push(database);
    database.sqlite.exec(
      "INSERT INTO trial_articles(id,source_id,url,title,excerpt,collected_at) VALUES('legacy','dh','https://www.dhnet.be/legacy','Titre','Extrait','2026-11-16T00:00:00Z')",
    );
    expect(
      database.sqlite
        .prepare("SELECT * FROM trial_articles WHERE id='legacy'")
        .get(),
    ).toMatchObject({
      body_text: "",
      image_url: null,
      image_credit: "",
      access_level: "unknown",
      publisher_categories: "[]",
      theme: null,
      subtheme: null,
    });
  });

  it("enregistre puis actualise le même article, y compris droits, image et classement", async () => {
    const database = memoryD1();
    databases.push(database);
    const { db, sqlite } = database;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          rss(
            item(
              '<description><![CDATA[<p>Premier texte</p><p>Suite</p>]]></description><dcterms:accessRights>FREE</dcterms:accessRights><category>Sport</category><category>Football</category><media:content url="https://www.dhnet.be/photo.jpg" type="image/jpeg"/><media:credit>Agence</media:credit>',
            ),
          ),
        ),
      );
    expect(await collectSource(db, "dh", fetcher)).toMatchObject({
      status: "ok",
      count: 1,
    });
    const initial = sqlite
      .prepare("SELECT * FROM trial_articles WHERE source_id='dh'")
      .get();
    expect(initial).toMatchObject({
      body_text: "Premier texte\n\nSuite",
      image_url: "https://www.dhnet.be/photo.jpg",
      image_credit: "Agence",
      access_level: "free",
      publisher_categories: '["Sport","Football"]',
      theme: "Sport",
      subtheme: "Football",
    });
    sqlite.exec("UPDATE trial_sources SET next_fetch_at=0 WHERE id='dh'");
    fetcher.mockResolvedValueOnce(
      new Response(
        rss(
          item(
            "<description>Nouveau texte réservé</description><dcterms:accessRights>PAYING</dcterms:accessRights><category>Économie</category><category>Marchés financiers</category>",
          ).replace("Une annonce", "Titre actualisé"),
        ),
      ),
    );
    expect(
      await collectSource(db, "dh", fetcher, Date.now() + 1000),
    ).toMatchObject({ status: "ok", count: 1 });
    const refreshed = sqlite
      .prepare("SELECT * FROM trial_articles WHERE source_id='dh'")
      .get();
    expect(refreshed).toMatchObject({
      id: initial?.id,
      title: "Titre actualisé",
      body_text: "",
      excerpt: "Nouveau texte réservé",
      image_url: null,
      image_credit: "",
      access_level: "restricted",
      publisher_categories: '["Économie","Marchés financiers"]',
      theme: "Économie",
      subtheme: "Marchés",
    });
    expect(refreshed?.collected_at).not.toBe(initial?.collected_at);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM trial_articles").get()
        ?.count,
    ).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("review regressions: scoped credits and metadata upgrade", () => {
  it("keeps credits with the selected media, including group inheritance", () => {
    const parsed =
      parse(`<media:content url="https://www.dhnet.be/video.mp4" type="video/mp4"><media:credit>Video agency</media:credit></media:content>
      <media:group><media:credit>Group agency</media:credit><media:content url="https://www.dhnet.be/selected.jpg" type="image/jpeg"><media:credit>Photo author</media:credit></media:content></media:group>
      <media:content url="https://www.dhnet.be/other.jpg" type="image/jpeg"><media:credit>Other author</media:credit></media:content>`);
    expect(parsed).toMatchObject({
      imageUrl: "https://www.dhnet.be/selected.jpg",
      imageCredit: "Photo author",
    });
  });
  it("does not borrow a rejected image's credit for a sibling", () => {
    expect(
      parse(
        `<media:content url="https://attacker.test/no.jpg"><media:credit>Wrong author</media:credit></media:content><media:content url="https://www.dhnet.be/selected.jpg"/>`,
      ),
    ).toMatchObject({
      imageUrl: "https://www.dhnet.be/selected.jpg",
      imageCredit: "",
    });
  });
  it("does not let an old worker's validator suppress the first metadata fetch", async () => {
    const value = memoryD1();
    databases.push(value);
    const { db, sqlite } = value;
    sqlite.exec(
      `UPDATE trial_sources SET etag='"old-worker"',last_modified='Mon, 16 Nov 2026 10:00:00 GMT' WHERE id='dh'`,
    );
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(rss(item("<description>Metadata</description>")), {
          headers: { etag: '"new-worker"' },
        }),
    );
    await collectSource(db, "dh", fetcher);
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      "If-None-Match",
    );
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      "If-Modified-Since",
    );
    expect(
      sqlite
        .prepare(
          "SELECT reading_metadata_version FROM trial_sources WHERE id='dh'",
        )
        .get()?.reading_metadata_version,
    ).toBe(1);
    sqlite.exec("UPDATE trial_sources SET next_fetch_at=0 WHERE id='dh'");
    await collectSource(db, "dh", fetcher);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      "If-None-Match": '"new-worker"',
    });
  });
});
