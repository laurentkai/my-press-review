import { describe, expect, it } from "vitest";
import {
  demoArticles,
  demoSources,
  filterArticles,
  parseSource,
} from "../apps/web/src/demo";
describe("demo selection", () => {
  it("combines theme, subject, search and source activation", () => {
    const result = filterArticles(
      demoArticles,
      demoSources,
      "Politique",
      "Présidentielle française",
      "territoires",
    );
    expect(result.map((a) => a.id)).toEqual(["territoires"]);
    expect(
      filterArticles(
        demoArticles,
        demoSources.map((s) => ({ ...s, enabled: false })),
        "Tous les thèmes",
        "Tous les sujets",
        "",
      ),
    ).toEqual([]);
    expect(
      filterArticles(demoArticles, demoSources, "Technologie", "Europe", ""),
    ).toEqual([]);
  });
  it.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "not-a-url",
    "https://user:password@example.com",
  ])("rejects unsafe demo source input %s", (url) => {
    expect(parseSource("Source", url)).toBeNull();
  });
  it("normalizes source inputs and rejects empty names", () => {
    expect(parseSource(" Source ", " https://example.com ")).toEqual({
      name: "Source",
      url: "https://example.com/",
    });
    expect(parseSource("   ", "https://example.com")).toBeNull();
    expect(parseSource("a".repeat(121), "https://example.com")).toBeNull();
  });
});
