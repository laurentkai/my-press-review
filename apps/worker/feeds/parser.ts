import { SaxesParser } from "saxes";
import { decodeHTML } from "entities";
import { isSourceUrl, type FeedSource } from "./catalog";
import { imageUrl } from "./images";

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
  bodyText: string;
  imageUrl: string | null;
  imageCredit: string;
  accessLevel: "free" | "restricted" | "unknown";
  categories: string[];
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
// Only the publisher's description/summary is used. No article HTML fetch,
// content:encoded, embedded HTML, links, scripts or styles are rendered.
export function readingText(value: string): string {
  return decodeHTML(value)
    .replace(/<(script|style|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6])\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2000);
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
  let categories: string[] = [];
  let images: { url: string; priority: number }[] = [];
  let field: string | null = null;
  const items: FeedItem[] = [];
  const fields = [
    "title",
    "description",
    "summary",
    "link",
    "pubdate",
    "published",
    "updated",
    "dpp:paid",
    "dcterms:accessrights",
    "category",
    "media:credit",
  ];
  const append = (text: string) => {
    if (
      item &&
      field &&
      !stack.some((name) => ["script", "style"].includes(name))
    )
      item[field] = ((item[field] ?? "") + text).slice(0, 12000);
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
      categories = [];
      images = [];
      itemDepth = stack.length;
    }
    if (item && stack.length === itemDepth + 1 && fields.includes(name)) {
      field = name;
      if (name === "category") item.category = "";
      if (name === "category" && tag.attributes.term)
        item.category = String(tag.attributes.term);
    }
    if (
      item &&
      stack.length > itemDepth + 1 &&
      field &&
      ["p", "div", "br", "li"].includes(name)
    )
      append("\n\n");
    if (
      item &&
      stack.length <= itemDepth + 2 &&
      ["media:content", "media:thumbnail", "enclosure"].includes(name)
    ) {
      const type = String(tag.attributes.type ?? "").toLowerCase();
      const medium = String(tag.attributes.medium ?? "").toLowerCase();
      const candidate = imageUrl(String(tag.attributes.url ?? ""), source);
      if (
        images.length < 8 &&
        candidate &&
        (!type || type.startsWith("image/")) &&
        (!medium || medium === "image") &&
        (name !== "enclosure" || type.startsWith("image/"))
      )
        images.push({
          url: candidate,
          priority:
            name === "media:content" ? 0 : name === "media:thumbnail" ? 1 : 2,
        });
    }
    if (item && name === "media:credit" && stack.length === itemDepth + 2)
      field = name;
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
    if (
      item &&
      field === "category" &&
      stack.at(-1) === "category" &&
      categories.length < 12
    )
      categories.push(plainText(item.category ?? "", 120));
    if (item && field && stack.at(-1) === field) field = null;
    if (item && stack.length === itemDepth) {
      const title = plainText(item.title ?? "", 500);
      const url = articleUrl(item.link ?? "", source);
      const rights = item["dcterms:accessrights"]?.trim().toUpperCase();
      const accessLevel =
        rights === "FREE"
          ? "free"
          : ["PAYING", "MEMBER"].includes(rights ?? "")
            ? "restricted"
            : "unknown";
      const description = item.description ?? item.summary ?? "";
      if (title && url && item["dpp:paid"]?.trim().toLowerCase() !== "true")
        items.push({
          url,
          title,
          excerpt: plainText(description, 300),
          bodyText:
            accessLevel === "restricted" ? "" : readingText(description),
          imageUrl:
            images.sort((a, b) => a.priority - b.priority)[0]?.url ?? null,
          imageCredit: plainText(item["media:credit"] ?? "", 200),
          accessLevel,
          categories: categories.filter(Boolean),
          publishedAt: publicationDate(
            item.pubdate ?? item.published ?? item.updated ?? "",
          ),
        });
      item = null;
      field = null;
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
