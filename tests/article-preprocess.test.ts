// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { preprocessArticleHtml } from "../apps/worker/feeds/article-preprocess";

afterEach(() => vi.unstubAllGlobals());

describe("prétraitement natif des articles", () => {
  it("renvoie le HTML inchangé en absence de HTMLRewriter", async () => {
    vi.stubGlobal("HTMLRewriter", undefined);
    const html =
      '<meta name="robots" content="noarchive"><script>payload</script><div class="paywall">Restriction</div>';
    expect(await preprocessArticleHtml(html)).toBe(html);
  });

  it("supprime seulement les scripts non JSON-LD et les sous-arbres inertes", async () => {
    const handlers = new Map<
      string,
      {
        element: (element: {
          getAttribute: (name: string) => string | null;
          remove: () => void;
        }) => void;
      }
    >();
    let response: Response | undefined;
    class Rewriter {
      on(
        selector: string,
        handler: typeof handlers extends Map<string, infer T> ? T : never,
      ) {
        handlers.set(selector, handler);
        return this;
      }
      transform(input: Response) {
        response = input;
        return new Response("native-output");
      }
    }
    vi.stubGlobal("HTMLRewriter", Rewriter);
    const html =
      '<meta name="robots" content="nosnippet"><div id="piano-paywall-FREE">Corps</div>';
    expect(await preprocessArticleHtml(html)).toBe("native-output");
    expect(await response!.text()).toBe(html);
    expect(response!.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect([...handlers.keys()]).toEqual([
      "script",
      "style, svg, template, noscript",
    ]);
    const remove = vi.fn();
    const script = handlers.get("script")!;
    for (const type of [
      "application/ld+json",
      " Application/LD+JSON ; charset=utf-8",
    ]) {
      script.element({ getAttribute: () => type, remove });
    }
    expect(remove).not.toHaveBeenCalled();
    for (const type of [
      null,
      "text/javascript",
      "application/json",
      "application/ld+json-evil",
    ]) {
      script.element({ getAttribute: () => type, remove });
    }
    expect(remove).toHaveBeenCalledTimes(4);
    handlers
      .get("style, svg, template, noscript")!
      .element({ getAttribute: () => null, remove });
    expect(remove).toHaveBeenCalledTimes(5);
  });
});
