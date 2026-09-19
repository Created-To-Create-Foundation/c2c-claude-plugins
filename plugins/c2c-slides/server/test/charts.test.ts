import { describe, expect, it } from "vitest";
import { layoutChart } from "../src/charts/svg.js";
import { svgToPng } from "../src/charts/png.js";
import { imageSize } from "../src/render/images.js";

describe("wykresy", () => {
  const area = { widthPt: 648, heightPt: 205, surface: "light" as const };
  it("słupkowy: etykiety kategorii i wartości w obszarze", () => {
    const l = layoutChart({ type: "column", categories: ["A", "B", "C"], series: [{ name: "s", values: [10, 20, 30] }], showValues: true }, area);
    expect(l.categoryLabels).toHaveLength(3);
    expect(l.valueLabels).toHaveLength(3);
    for (const c of l.categoryLabels) { expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x + c.w).toBeLessThanOrEqual(area.widthPt + 1); }
    expect(l.svg).toContain("<path");
  });
  it("donut: legenda z wartościami i środek", () => {
    const l = layoutChart({ type: "donut", categories: ["A", "B"], series: [{ name: "s", values: [1, 3] }], showValues: true, valueSuffix: "%" }, area);
    expect(l.legend).toHaveLength(2);
    expect(l.center?.text).toContain("4");
  });
  it("wyróżnienie serii daje złoto tylko jednej serii", () => {
    const l = layoutChart({ type: "column", categories: ["A"], series: [{ name: "a", values: [1] }, { name: "b", values: [2] }], showValues: false, highlightSeries: 1 }, area);
    expect(l.seriesColors[1].toUpperCase()).toBe("#A37A5C");
    expect(l.seriesColors[0]).not.toBe(l.seriesColors[1]);
  });
  it("SVG renderuje się do PNG o właściwej skali", async () => {
    const l = layoutChart({ type: "line", categories: ["A", "B", "C"], series: [{ name: "s", values: [1, 2, 3] }], showValues: true }, area);
    const png = await svgToPng(l.svg, 2);
    const s = imageSize(png);
    expect(s.mime).toBe("image/png");
    expect(s.width).toBe(area.widthPt * 2);
  });
});
