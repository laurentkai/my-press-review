import { SaxesParser } from "saxes";
import { decodeHTML } from "entities";
import { isSourceUrl, type FeedSource } from "./catalog";

export class FeedError extends Error {
  constructor(public status: string) {
    super(status);
  }
}
export interface FeedItem {
  url: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}
export function plainText(value: string, max: number): string {
  return decodeHTML(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
export function publicationDate(
  value: string,
  now = Date.now(),
): string | null {
  // A date without an explicit timezone (Investing) is not silently invented.
  if (!/(?:Z|[+-]\d{2}:?\d{2}|\bGMT|\bUTC|\bUT)$/i.test(value.trim()))
    return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) &&
    timestamp >= 0 &&
    timestamp <= now + 86_400_000
    ? new Date(timestamp).toISOString()
    : null;
}
export function articleUrl(value: string, source: FeedSource): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim(), source.feed ?? source.url);
    url.hash = "";
    if (url.protocol === "http:") url.protocol = "https:";
    for (const key of [...url.searchParams.keys()])
      if (/^utm_/i.test(key) || ["fbclid", "gclid"].includes(key))
        url.searchParams.delete(key);
    return url.href.length <= 2048 && isSourceUrl(url.href, source)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function parseFeed(xml: string, source: FeedSource): FeedItem[] {
  const parser = new SaxesParser({ xmlns: false });
  const stack: string[] = [];
  let root = "";
  let item: Record<string, string> | null = null;
  let itemDepth = 0;
  let seen = 0;
  const items: FeedItem[] = [];
  const append = (text: string) => {
    if (item && stack.length === itemDepth + 1) {
      const name = stack.at(-1)!;
      if (
        [
          "title",
          "description",
          "summary",
          "link",
          "pubdate",
          "published",
          "updated",
          "dpp:paid",
        ].includes(name)
      )
        item[name] = ((item[name] ?? "") + text).slice(0, 6000);
    }
  };
  parser.on("doctype", () => {
    throw new FeedError("invalid_xml");
  });
  parser.on("opentag", (tag) => {
    const name = tag.name.toLowerCase();
    stack.push(name);
    if (stack.length > 32) throw new FeedError("invalid_xml");
    if (stack.length === 1) {
      root = name;
      if (!["rss", "feed"].includes(root)) throw new FeedError("invalid_xml");
    }
    if (
      (root === "rss" && stack.join("/") === "rss/channel/item") ||
      (root === "feed" && stack.join("/") === "feed/entry")
    ) {
      if (++seen > 200) throw new FeedError("too_many_items");
      item = {};
      itemDepth = stack.length;
    }
    if (
      item &&
      root === "feed" &&
      name === "link" &&
      stack.length === itemDepth + 1 &&
      (!tag.attributes.rel || tag.attributes.rel === "alternate")
    )
      item.link = String(tag.attributes.href ?? "");
  });
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => {
    if (item && stack.length === itemDepth) {
      const title = plainText(item.title ?? "", 500);
      const url = articleUrl(item.link ?? "", source);
      if (title && url && item["dpp:paid"]?.trim().toLowerCase() !== "true")
        items.push({
          url,
          title,
          excerpt: plainText(item.description ?? item.summary ?? "", 300),
          publishedAt: publicationDate(
            item.pubdate ?? item.published ?? item.updated ?? "",
          ),
        });
      item = null;
    }
    stack.pop();
  });
  parser.on("error", () => {
    throw new FeedError("invalid_xml");
  });
  try {
    parser.write(xml).close();
  } catch (error) {
    if (error instanceof FeedError) throw error;
    throw new FeedError("invalid_xml");
  }
  if (!root) throw new FeedError("invalid_xml");
  return [...new Map(items.map((entry) => [entry.url, entry])).values()];
}
