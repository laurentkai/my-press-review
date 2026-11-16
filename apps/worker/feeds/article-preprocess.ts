/** Drop inert payloads with the Workers native streaming parser before extraction.
 * Node has no HTMLRewriter: the unchanged fallback makes no performance claim.
 * This is not a sanitizer; publisher policy and access checks stay in extraction.
 */
export async function preprocessArticleHtml(html: string): Promise<string> {
  if (typeof HTMLRewriter === "undefined") return html;
  return new HTMLRewriter()
    .on("script", {
      element(element) {
        const type = element
          .getAttribute("type")
          ?.split(";")[0]
          ?.trim()
          .toLowerCase();
        if (type !== "application/ld+json") element.remove();
      },
    })
    .on("style, svg, template, noscript", {
      element(element) {
        element.remove();
      },
    })
    .transform(
      new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )
    .text();
}
