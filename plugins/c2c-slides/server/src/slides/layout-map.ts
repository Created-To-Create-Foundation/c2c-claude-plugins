/**
 * Mapowanie layoutów Google Slides (po konwersji szablonu) na katalog LAYOUTS.
 * Placeholdery dopasowujemy po GEOMETRII (najbliższy prostokąt tego samego rodzaju),
 * bo konwersja .pptx -> Slides nie gwarantuje nazw ani indeksów.
 */
import type { Page, PageElement, Presentation } from "../google/api.js";
import { LAYOUTS, type LayoutDef, type PhKind } from "../brand/layouts.js";

export const EMU_PER_IN = 914400;
export const EMU_PER_PT = 12700;

export interface Box { x: number; y: number; w: number; h: number }

export function elementBox(el: PageElement): Box {
  const tr = el.transform ?? { unit: "EMU" };
  const unitMul = tr.unit === "PT" ? EMU_PER_PT : 1;
  const sx = tr.scaleX ?? 1;
  const sy = tr.scaleY ?? 1;
  const sizeMul = (d?: { magnitude: number; unit: string }) => (d ? d.magnitude * (d.unit === "PT" ? EMU_PER_PT : 1) : 0);
  const w = sizeMul(el.size?.width) * Math.abs(sx);
  const h = sizeMul(el.size?.height) * Math.abs(sy);
  return { x: ((tr.translateX ?? 0) * unitMul) / EMU_PER_IN, y: ((tr.translateY ?? 0) * unitMul) / EMU_PER_IN, w: w / EMU_PER_IN, h: h / EMU_PER_IN };
}

export interface MappedPlaceholder { key: string; kind: PhKind; objectId: string; type: string; index: number; box: Box }
export interface LayoutMap { layout: LayoutDef; layoutObjectId: string; placeholders: Record<string, MappedPlaceholder> }

const KIND_TYPES: Record<PhKind, string[]> = {
  title: ["TITLE", "CENTERED_TITLE", "SUBTITLE", "BODY"],
  body: ["BODY", "SUBTITLE", "OBJECT", "TITLE", "CENTERED_TITLE"],
  pic: ["PICTURE", "OBJECT", "BODY"],
};

const SKIP_TYPES = ["SLIDE_NUMBER", "DATE_AND_TIME", "FOOTER", "HEADER"];

function placeholders(page: Page): { el: PageElement; type: string; index: number; box: Box }[] {
  return (page.pageElements ?? [])
    .filter((el) => el.shape?.placeholder || el.image?.placeholder)
    .map((el) => {
      const ph = (el.shape?.placeholder ?? el.image?.placeholder)!;
      return { el, type: ph.type, index: ph.index ?? 0, box: elementBox(el) };
    })
    .filter((p) => !SKIP_TYPES.includes(p.type));
}

function distance(a: Box, b: Box): number {
  return Math.hypot(a.x - b.x, a.y - b.y) + 0.35 * Math.hypot(a.w - b.w, a.h - b.h);
}

export function mapLayout(def: LayoutDef, page: Page): LayoutMap {
  const pool = placeholders(page);
  const used = new Set<number>();
  const out: LayoutMap = { layout: def, layoutObjectId: page.objectId, placeholders: {} };
  const rank: Record<PhKind, number> = { pic: 0, title: 1, body: 2 };
  const order = [...def.placeholders].sort((a, b) => rank[a.kind] - rank[b.kind]);
  for (const ph of order) {
    let best = -1;
    let bestD = Infinity;
    pool.forEach((cand, i) => {
      if (used.has(i)) return;
      const typeRank = KIND_TYPES[ph.kind].indexOf(cand.type);
      if (typeRank < 0) return;
      const d = distance(ph, cand.box) + typeRank * 0.15;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0 && bestD < 1.2) {
      used.add(best);
      const c = pool[best];
      out.placeholders[ph.key] = { key: ph.key, kind: ph.kind, objectId: c.el.objectId, type: c.type, index: c.index, box: c.box };
    }
  }
  return out;
}

function matchesName(def: LayoutDef, name: string): boolean {
  if (!name) return false;
  if (name === def.name) return true;
  const short = def.name.split("· ")[1];
  return !!short && (name.endsWith(short) || name.replace(/\s+/g, " ") === def.name.replace(/\s+/g, " "));
}

/** Wszystkie layouty C2C znalezione w prezentacji (po displayName). */
export function mapLayouts(pres: Presentation): LayoutMap[] {
  const maps: LayoutMap[] = [];
  for (const page of pres.layouts ?? []) {
    const name = page.layoutProperties?.displayName ?? page.layoutProperties?.name ?? "";
    const def = LAYOUTS.find((l) => matchesName(l, name));
    if (def && !maps.some((m) => m.layout.id === def.id)) maps.push(mapLayout(def, page));
  }
  return maps;
}

export function requireLayout(maps: LayoutMap[], id: string): LayoutMap {
  const m = maps.find((x) => x.layout.id === id);
  if (!m) {
    throw new Error(`Prezentacja nie zawiera layoutu C2C "${id}". To nie jest prezentacja z szablonu C2C (lub szablon jest starszy). Użyj c2c_create_deck albo c2c_rebrand_deck.`);
  }
  return m;
}

export function layoutMapForSlide(maps: LayoutMap[], slide: Page): LayoutMap | undefined {
  return maps.find((m) => m.layoutObjectId === slide.slideProperties?.layoutObjectId);
}

/** Placeholdery slajdu wg klucza layoutu (po parentObjectId, awaryjnie po typie+indeksie, potem po geometrii). */
export function slidePlaceholders(slide: Page, map: LayoutMap): Record<string, PageElement> {
  const out: Record<string, PageElement> = {};
  const els = (slide.pageElements ?? []).filter((el) => el.shape?.placeholder);
  for (const [key, mp] of Object.entries(map.placeholders)) {
    let el = els.find((e) => e.shape!.placeholder!.parentObjectId === mp.objectId);
    if (!el) el = els.find((e) => e.shape!.placeholder!.type === mp.type && (e.shape!.placeholder!.index ?? 0) === mp.index);
    if (!el) {
      let bestD = 0.6;
      for (const e of els) {
        const d = distance(mp.box, elementBox(e));
        if (d < bestD && !Object.values(out).includes(e)) { bestD = d; el = e; }
      }
    }
    if (el) out[key] = el;
  }
  return out;
}

export function textOf(el: PageElement | undefined): string {
  if (!el?.shape?.text?.textElements) return "";
  return el.shape.text.textElements.map((t) => t.textRun?.content ?? "").join("").replace(/\n$/, "");
}
