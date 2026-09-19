import { describe, expect, it } from "vitest";
import { DeckSpec, layoutIdFor, SlideSpec } from "../src/spec/deck-spec.js";
import { LAYOUT_BY_ID } from "../src/brand/layouts.js";

describe("DeckSpec", () => {
  it("akceptuje minimalną prezentację", () => {
    const r = DeckSpec.safeParse({ title: "Test", slides: [{ type: "cover", title: "Tytuł" }] });
    expect(r.success).toBe(true);
  });
  it("odrzuca nieznany typ slajdu i przekroczone limity", () => {
    expect(DeckSpec.safeParse({ title: "T", slides: [{ type: "banner", title: "x" }] }).success).toBe(false);
    expect(DeckSpec.safeParse({ title: "T", slides: [{ type: "bullets", title: "x", bullets: Array(8).fill("p") }] }).success).toBe(false);
    expect(DeckSpec.safeParse({ title: "T", slides: [{ type: "cards", title: "x", cards: [{ title: "a", body: "b" }] }] }).success).toBe(false);
  });
  it("każdy typ slajdu mapuje się na istniejący layout", () => {
    const samples: unknown[] = [
      { type: "cover", title: "a" }, { type: "section", title: "a" }, { type: "statement", title: "a" }, { type: "bullets", title: "a", bullets: ["x"] },
      { type: "two-column", title: "a", left: { bullets: [] }, right: { bullets: [] } }, { type: "text-image", title: "a", bullets: ["x"], image: { url: "https://example.com/a.png" } },
      { type: "cards", title: "a", cards: [{ title: "a", body: "b" }, { title: "a", body: "b" }, { title: "a", body: "b" }] },
      { type: "cards", title: "a", cards: Array(4).fill({ title: "a", body: "b" }) },
      { type: "numbers", title: "a", items: [{ value: "1", label: "x" }] }, { type: "agenda", title: "a", items: [{ label: "x" }, { label: "y" }] },
      { type: "table", title: "a", columns: ["a", "b"], rows: [["1", "2"]] }, { type: "quote", quote: "q" }, { type: "quote", quote: "q", surface: "light" },
      { type: "chart", title: "a", chart: { type: "bar", categories: ["a"], series: [{ name: "s", values: [1] }] } },
      { type: "diagram", title: "a", diagram: { type: "process", steps: [{ title: "a" }, { title: "b" }] } },
      { type: "diagram", title: "a", surface: "dark", diagram: { type: "matrix", xAxis: ["a", "b"], yAxis: ["c", "d"], quadrants: ["1", "2", "3", "4"] } },
      { type: "photo", image: { url: "https://example.com/a.jpg" } }, { type: "people", title: "a", people: [{ name: "n", role: "r" }] }, { type: "closing" },
    ];
    for (const s of samples) {
      const parsed = SlideSpec.parse(s);
      expect(LAYOUT_BY_ID[layoutIdFor(parsed)], `layout dla ${parsed.type}`).toBeDefined();
    }
  });
});
