export const trialCatalog = [
  {
    id: "7sur7",
    name: "7sur7",
    url: "https://www.7sur7.be/",
    category: "Belgique",
    feed: "https://www.7sur7.be/home/rss.xml",
  },
  {
    id: "dh",
    name: "La DH",
    url: "https://www.dhnet.be/",
    category: "Belgique",
    feed: "https://www.dhnet.be/arc/outboundfeeds/rss/?outputType=xml",
  },
  {
    id: "lalibre",
    name: "La Libre",
    url: "https://www.lalibre.be/",
    category: "Belgique",
    feed: "https://www.lalibre.be/arc/outboundfeeds/rss/?outputType=xml",
  },
  {
    id: "lesoir",
    name: "Le Soir",
    url: "https://www.lesoir.be/",
    category: "Belgique",
    feed: null,
  },
  {
    id: "figaro",
    name: "Le Figaro",
    url: "https://www.lefigaro.fr/",
    category: "France",
    feed: "https://www.lefigaro.fr/rss/figaro_actualites.xml",
  },
  {
    id: "lejsl",
    name: "Le JSL",
    url: "https://www.lejsl.com/",
    category: "Bourgogne",
    feed: "https://www.lejsl.com/rss",
  },
  {
    id: "investing",
    name: "Investing.com",
    url: "https://www.investing.com/",
    category: "Économie et finance",
    feed: "https://fr.investing.com/rss/news.rss",
  },
  {
    id: "zonebourse",
    name: "Zonebourse",
    url: "https://www.zonebourse.com/",
    category: "Économie et finance",
    feed: null,
  },
  {
    id: "gouvernement",
    name: "Gouvernement.lu",
    url: "https://gouvernement.lu/",
    category: "Luxembourg",
    feed: "https://gouvernement.lu/fr/actualites/toutes_actualites.rss",
  },
] as const;
export type FeedSource = (typeof trialCatalog)[number];
export const MIN_INTERVAL = 15 * 60_000;

export function isSourceUrl(value: string, source: FeedSource): boolean {
  try {
    const url = new URL(value);
    const hosts = [
      new URL(source.url).hostname,
      ...(source.feed ? [new URL(source.feed).hostname] : []),
    ];
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      hosts.includes(url.hostname) &&
      !url.hash
    );
  } catch {
    return false;
  }
}
