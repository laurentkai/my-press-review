import type { FeedSource } from "./catalog";

// Publisher/CDN origins observed in the selected feeds. This list is separate
// from fetch destinations: the Worker never requests these image URLs.
const imageHosts: Record<string, readonly string[]> = {
  "7sur7": ["images.7sur7.be"],
  dh: ["www.dhnet.be"],
  lalibre: ["www.lalibre.be"],
  figaro: ["i.f1g.fr"],
  investing: ["content-media.investing.com"],
};
export function imageUrl(value: string, source: FeedSource): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim(), source.feed ?? source.url);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      url.href.length <= 2048 &&
      (imageHosts[source.id] ?? []).includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
