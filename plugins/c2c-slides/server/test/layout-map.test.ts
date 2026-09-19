import { describe, expect, it } from "vitest";
import { mapLayout, slidePlaceholders, elementBox } from "../src/slides/layout-map.js";
import { layout } from "../src/brand/layouts.js";
import type { Page, PageElement } from "../src/google/api.js";

const EMU = 914400;
function ph(id: string, type: string, index: number, x: number, y: number, w: number, h: number, parent?: string): PageElement {
  return { objectId: id, size: { width: { magnitude: w * EMU, unit: "EMU" }, height: { magnitude: h * EMU, unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: x * EMU, translateY: y * EMU, unit: "EMU" }, shape: { placeholder: { type, index, parentObjectId: parent } } };
}

describe("mapowanie layoutu po geometrii", () => {
  it("dopasowuje placeholdery okładki mimo przetasowanych indeksów", () => {
    const def = layout("cover");
    const page: Page = { objectId: "L1", pageElements: [
      ph("subtitleEl", "BODY", 7, 0.5, 3.6, 8, 0.8),
      ph("titleEl", "TITLE", 0, 0.5, 2.2, 9, 1.35),
      ph("metaEl", "BODY", 3, 0.5, 4.75, 8, 0.35),
      ph("num", "SLIDE_NUMBER", 12, 8.9, 5.12, 0.6, 0.3),
    ] };
    const m = mapLayout(def, page);
    expect(m.placeholders.title.objectId).toBe("titleEl");
    expect(m.placeholders.subtitle.objectId).toBe("subtitleEl");
    expect(m.placeholders.meta.objectId).toBe("metaEl");
  });
  it("odnajduje placeholdery slajdu po parentObjectId", () => {
    const def = layout("bullets");
    const page: Page = { objectId: "L2", pageElements: [ph("eb", "BODY", 1, 0.5, 0.55, 9, 0.3), ph("ti", "TITLE", 0, 0.5, 0.9, 9, 0.9), ph("bo", "BODY", 2, 0.5, 1.95, 9, 3)] };
    const m = mapLayout(def, page);
    const slide: Page = { objectId: "S", pageElements: [ph("s1", "BODY", 2, 0.5, 1.95, 9, 3, "bo"), ph("s2", "TITLE", 0, 0.5, 0.9, 9, 0.9, "ti")] };
    const els = slidePlaceholders(slide, m);
    expect(els.body.objectId).toBe("s1");
    expect(els.title.objectId).toBe("s2");
    expect(els.eyebrow).toBeUndefined();
  });
  it("liczy geometrię w calach z transformacji", () => {
    const b = elementBox(ph("x", "BODY", 0, 1, 2, 3, 4));
    expect(b).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });
});
