import { Parser } from "htmlparser2";

export interface ArticleExtraction {
  status: "available" | "restricted" | "unavailable";
  text: string;
  reason: string;
  cacheable?: boolean;
}

// Exact class tokens only; intentionally no generic article/main fallback.
const bodyClasses: Record<string, readonly string[]> = {
  gouvernement: ["cmp-text", "article-body"],

  figaro: ["fig-content-body"],
  lejsl: ["articleBody"],
  investing: ["article_WYSIWYG"],
};
const MAX_TEXT = 80_000;
const MIN_TEXT = 400;
const ignoredTags = new Set([
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "iframe",
  "svg",
  "template",
  "noscript",
  "figcaption",
  "figure",
]);
const ignoredClass =
  /(?:^|[\s_-])(?:ad|ads|advertisement|advertising|publicite|navigation|recommendations?|related|comments?|caption|social|share)(?:$|[\s_-])/i;
const restrictionClass =
  /(?:^|[\s_-])(?:paywall|premium-wall|subscription-wall|consent-wall|consentwall|cookie-wall|piano-wall|regwall)(?:$|[\s_-])/i;
const restrictionText =
  /(?:article|contenu|suite).{0,60}(?:réservé|réservée|abonnés|abonné)|(?:abonnez-vous|connectez-vous).{0,70}(?:lire|suite|article)|(?:acceptez|consentez).{0,70}(?:continuer|accéder)|subscribe to (?:continue|read)|already a subscriber/i;
const normalize = (text: string) =>
  text
    .replace(/[\t\r\f\v \u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const result = (
  status: ArticleExtraction["status"],
  reason: string,
  text = "",
): ArticleExtraction => ({ status, text, reason });

interface Frame {
  ignored: boolean;
  hidden: boolean;
  candidate: string[] | undefined;
  json: string[] | undefined;
  main: boolean;
  freeStory: boolean;
}

/** Extracts only a configured visible body or explicitly free Article JSON-LD.
 * `available` describes extraction, never a guarantee of editorial completeness.
 */
export function extractArticle(
  html: string,
  sourceId: string,
): ArticleExtraction {
  let cacheable = true;
  const finish = (
    status: ArticleExtraction["status"],
    reason: string,
    text = "",
  ) => ({ ...result(status, reason, text), cacheable });
  const ipm = sourceId === "dh" || sourceId === "lalibre";
  if (html.length > 2_000_000) return finish("unavailable", "html_too_large");
  const candidates: string[][] = [];
  const jsonBlocks: string[][] = [];
  const frames: Frame[] = [];
  let restricted = false;
  let publisherPolicy = false;
  let freeBodySeen = false;
  const paragraphCounts = new Map<string[], number>();
  let tooDeep = false;
  let incomplete = false;
  let jsonLimit = false;
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        const parent = frames.at(-1);
        const classes = attrs.class ?? "";
        const tokens = parent?.candidate ? [] : classes.split(/\s+/);
        const main = Boolean(
          parent?.main || (name === "main" && attrs.id === "main"),
        );
        const freeStory = Boolean(
          parent?.freeStory || attrs.id === "story-content-FREE",
        );
        if (
          name === "meta" &&
          /^(?:robots|googlebot|bingbot)$/i.test(attrs.name ?? "")
        ) {
          const directives = (attrs.content ?? "").toLowerCase();
          if (/(?:^|[,;\s])noarchive(?:$|[,;\s])/.test(directives))
            cacheable = false;
          if (
            /(?:^|[,;\s])nosnippet(?:$|[,;\s])|(?:^|[,;\s])max-snippet\s*:\s*0(?:$|[,;\s])/.test(
              directives,
            )
          )
            publisherPolicy = true;
        }
        const hidden = Boolean(
          parent?.hidden ||
          "hidden" in attrs ||
          attrs["aria-hidden"] === "true" ||
          /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(
            attrs.style ?? "",
          ),
        );
        const inert = ignoredTags.has(name);
        const ignored = Boolean(
          parent?.ignored ||
          inert ||
          hidden ||
          ignoredClass.test(classes + " " + (attrs.id ?? "")) ||
          (ipm &&
            /ap-(?:StoryInterstitialLink|AdContainer|SmartTarget|StoryVideo)|NewsletterPromo/.test(
              classes + " " + (attrs.id ?? ""),
            )),
        );
        // Script names and invisible marketing templates are not access gates.
        if (
          !hidden &&
          !parent?.ignored &&
          !inert &&
          attrs.id !== "piano-paywall-FREE" &&
          restrictionClass.test(classes + " " + (attrs.id ?? ""))
        )
          restricted = true;
        let candidate = parent?.candidate;
        if (
          !ignored &&
          !candidate &&
          (ipm
            ? attrs.id === "article-text" && tokens.includes("ap-Story-content")
            : sourceId === "gouvernement"
              ? main && tokens.includes("cmp-text")
              : (bodyClasses[sourceId] ?? []).some((token) =>
                  tokens.includes(token),
                ))
        ) {
          candidate = [];
          candidates.push(candidate);
        }
        if (
          !ignored &&
          candidate &&
          /(?:preview|excerpt|truncat|line-clamp)/i.test(
            classes + " " + (attrs.style ?? ""),
          )
        )
          incomplete = true;
        if (!ignored && candidate && name === "p")
          paragraphCounts.set(
            candidate,
            (paragraphCounts.get(candidate) ?? 0) + 1,
          );
        const json =
          name === "script" &&
          attrs.type?.toLowerCase().split(";")[0]?.trim() ===
            "application/ld+json"
            ? []
            : undefined;
        if (json) jsonBlocks.push(json);
        frames.push({ ignored, hidden, candidate, json, main, freeStory });
        if (frames.length > 128) tooDeep = true;
        if (
          !ignored &&
          /^(?:p|div|section|h[1-6]|li|blockquote|br)$/.test(name)
        )
          candidate?.push("\n\n");
      },
      ontext(text) {
        const frame = frames.at(-1);
        if (frame?.json) frame.json.push(text);
        if (!frame?.ignored) {
          frame?.candidate?.push(text);
          if (frame?.candidate && frame.freeStory && text.trim())
            freeBodySeen = true;
        }
      },
      onclosetag(name) {
        const frame = frames.pop();
        if (
          !frame?.ignored &&
          /^(?:p|div|section|h[1-6]|li|blockquote)$/.test(name)
        )
          frame?.candidate?.push("\n\n");
      },
    },
    { decodeEntities: true },
  );
  try {
    parser.end(html);
  } catch {
    return finish("unavailable", "invalid_html");
  }
  if (tooDeep) return finish("unavailable", "html_too_deep");
  const jsonCandidates: string[] = [];
  // Iterative traversal bounds work and avoids hostile recursive JSON structures.
  for (const block of jsonBlocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.join(""));
    } catch {
      continue;
    }
    const queue: unknown[] = [parsed];
    let visited = 0;
    while (queue.length && visited++ < 20_000) {
      const value = queue.pop();
      if (!value || typeof value !== "object") continue;
      if (Array.isArray(value)) {
        for (const entry of value) queue.push(entry);
        continue;
      }
      const object = value as Record<string, unknown>;
      const types = Array.isArray(object["@type"])
        ? object["@type"]
        : [object["@type"]];
      if (
        types.some(
          (type) =>
            typeof type === "string" &&
            /(?:^|[/#])(?:Article|NewsArticle|ReportageNewsArticle|AnalysisNewsArticle|BlogPosting)$/.test(
              type,
            ),
        )
      ) {
        const descendants: unknown[] = [object];
        let denied = false;
        while (descendants.length) {
          const child = descendants.pop();
          if (!child || typeof child !== "object") continue;
          if (Array.isArray(child)) {
            for (const entry of child) descendants.push(entry);
            continue;
          }
          const entry = child as Record<string, unknown>;
          if (
            entry.isAccessibleForFree === false ||
            (typeof entry.isAccessibleForFree === "string" &&
              entry.isAccessibleForFree.trim().toLowerCase() === "false")
          )
            denied = true;
          if (entry.hasPart) descendants.push(entry.hasPart);
        }
        if (denied) restricted = true;
        if (
          !denied &&
          (object.isAccessibleForFree === true ||
            (typeof object.isAccessibleForFree === "string" &&
              object.isAccessibleForFree.trim().toLowerCase() === "true") ||
            sourceId === "gouvernement") &&
          typeof object.articleBody === "string"
        )
          jsonCandidates.push(object.articleBody);
      }
      for (const entry of Object.values(object)) queue.push(entry);
    }
    if (queue.length) jsonLimit = true;
  }
  const normalizedCandidates = new Map(
    candidates.map((parts) => [parts, normalize(parts.join(""))]),
  );
  if (
    restricted ||
    [...normalizedCandidates.values()].some((body) =>
      restrictionText.test(body),
    )
  )
    return finish("restricted", "access_restricted");
  if (publisherPolicy) return finish("unavailable", "publisher_policy");
  if (jsonLimit) return finish("unavailable", "json_too_complex");
  if (incomplete) return finish("unavailable", "incomplete_body");
  let selectedCandidates = candidates;
  if (sourceId === "gouvernement") {
    // AEM may place a one-paragraph introduction before its first article block.
    selectedCandidates = candidates
      .filter((parts) => (paragraphCounts.get(parts) ?? 0) >= 2)
      .slice(0, 1);
  }
  const domBodies = selectedCandidates
    .map((parts) => normalizedCandidates.get(parts) ?? "")
    .filter(Boolean);
  const jsonBodies = [
    ...new Set(jsonCandidates.map(cleanJsonText).filter(Boolean)),
  ];
  if (ipm) {
    if (!freeBodySeen || jsonBodies.length !== 1 || domBodies.length !== 1)
      return finish(
        "unavailable",
        jsonBodies.length > 1 || domBodies.length > 1
          ? "ambiguous_body"
          : "body_not_found",
      );
    // Same article must be represented in the visible FREE container. Ignore only
    // spacing/punctuation differences, and allow at most 10% unmatched words.
    if (!correspondingBodies(domBodies[0]!, jsonBodies[0]!))
      return finish("unavailable", "body_mismatch");
  }
  const bodies = domBodies.length ? domBodies : ipm ? [] : jsonBodies;
  if (bodies.some((body) => body.length > MAX_TEXT))
    return finish("unavailable", "text_too_large");
  const unique = [...new Set(bodies.filter(Boolean))];
  // Multiple separate bodies cannot safely be joined or attributed to this article.
  const maximal = unique;
  if (maximal.length > 1) return finish("unavailable", "ambiguous_body");
  const text = maximal[0] ?? "";
  if (text.length < MIN_TEXT)
    return finish("unavailable", text ? "body_too_short" : "body_not_found");
  if (
    /(?:…|\.{3}|\[\s*…\s*\])\s*$/.test(text) ||
    /(?:lire la suite|read more|suite de l.article|texte tronqué)\s*[.!…]*$/i.test(
      text,
    )
  )
    return finish("unavailable", "incomplete_body");
  return finish("available", "body_extracted", text);
}

function cleanJsonText(html: string): string {
  const parts: string[] = [];
  let ignored = 0;
  const stack: boolean[] = [];
  const parser = new Parser(
    {
      onopentag(name) {
        const skip = ignoredTags.has(name);
        stack.push(skip);
        if (skip) ignored++;
        if (!ignored && /^(?:p|div|br)$/.test(name)) parts.push("\n\n");
      },
      ontext(text) {
        if (!ignored) parts.push(text);
      },
      onclosetag(name) {
        if (stack.pop()) ignored--;
        if (!ignored && /^(?:p|div)$/.test(name)) parts.push("\n\n");
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  return normalize(parts.join(""));
}

function correspondingBodies(dom: string, json: string): boolean {
  const words = (text: string) =>
    text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const left = words(dom);
  const right = words(json);
  if (
    !left.length ||
    !right.length ||
    Math.min(left.length, right.length) / Math.max(left.length, right.length) <
      0.9
  )
    return false;
  // Ordered matching prevents bodies sharing only common vocabulary from passing.
  let matched = 0;
  for (const word of left) if (word === right[matched]) matched++;
  if (matched / right.length >= 0.9) return true;
  matched = 0;
  for (const word of right) if (word === left[matched]) matched++;
  return matched / left.length >= 0.9;
}
