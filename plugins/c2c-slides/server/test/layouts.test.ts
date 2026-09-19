import { describe, expect, it } from "vitest";
import { LAYOUTS } from "../src/brand/layouts.js";
import { tokens } from "../src/brand/tokens.js";

describe("katalog layoutów", () => {
  it("ma unikalne id i nazwy z prefiksem C2C", () => {
    const ids = LAYOUTS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LAYOUTS) expect(l.name.startsWith("C2C · ")).toBe(true);
  });
  it("placeholdery mieszczą się na slajdzie i używają kolorów z tokenów", () => {
    const t = tokens();
    for (const l of LAYOUTS) {
      const keys = l.placeholders.map((p) => p.key);
      expect(new Set(keys).size, l.id).toBe(keys.length);
      for (const p of l.placeholders) {
        expect(p.x + p.w, `${l.id}.${p.key}`).toBeLessThanOrEqual(t.slide.widthIn + 1e-6);
        expect(p.y + p.h, `${l.id}.${p.key}`).toBeLessThanOrEqual(t.slide.heightIn + 1e-6);
        if (p.style) expect(t.colors[p.style.color], `${l.id}.${p.key} kolor`).toBeDefined();
      }
    }
  });
  it("layouty z treścią natywną mają contentArea", () => {
    for (const id of ["table", "chart", "diagram", "diagram-dark"]) expect(LAYOUTS.find((l) => l.id === id)?.contentArea).toBeDefined();
  });
});
