/**
 * Katalog layoutów C2C: JEDNO źródło prawdy dla
 *  - buildera szablonu .pptx (pptxgenjs defineSlideMaster),
 *  - renderera Google Slides (mapowanie placeholderów po geometrii),
 *  - renderera .pptx (fallback).
 * Jednostki: cale (slajd 10 x 5.625 in = 960 x 540 pt).
 */

export type Surface = "dark" | "light";
export type PhKind = "title" | "body" | "pic";

export interface PhStyle {
  font: "heading" | "body";
  sizePt: number;
  color: string; // klucz z tokens.colors
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  caps?: boolean;
  bullets?: boolean;
  lineSpacing?: number; // multiple, np. 1.2
  paraSpaceAfterPt?: number;
  transparency?: number; // 0..100 (pptx only; Slides ignoruje)
}

export interface Placeholder {
  key: string;
  kind: PhKind;
  x: number;
  y: number;
  w: number;
  h: number;
  prompt: string;
  style?: PhStyle;
}

export type Decor =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; transparency?: number; radius?: number; lineColor?: string; lineTransparency?: number; lineWidthPt?: number }
  | { kind: "line"; x: number; y: number; w: number; h: number; color: string; transparency?: number; widthPt?: number }
  | { kind: "image"; asset: string; x: number; y: number; w: number; h: number };

export interface Area { x: number; y: number; w: number; h: number }

export interface LayoutDef {
  id: string;
  name: string; // displayName layoutu w Slides ("C2C · ...")
  surface: Surface;
  background: "dark" | "light" | "none";
  footer: boolean; // logo + numer slajdu
  placeholders: Placeholder[];
  decor: Decor[];
  /** Obszar na treść generowaną natywnie (wykres, tabela, diagram). */
  contentArea?: Area;
}

const W = 10;
const H = 5.625;
const M = 0.5;
const CW = W - 2 * M; // 9

const eyebrow = (surface: Surface, y = 0.55, key = "eyebrow"): Placeholder => ({
  key, kind: "body", x: M, y, w: CW, h: 0.3, prompt: "EYEBROW",
  style: { font: "body", sizePt: 11, color: "gold", bold: true, caps: true, valign: "bottom" },
});

const slideTitle = (surface: Surface, opts: Partial<Placeholder> = {}): Placeholder => ({
  key: "title", kind: "title", x: M, y: 0.9, w: CW, h: 0.9, prompt: "Tytuł slajdu",
  style: { font: "heading", sizePt: 30, color: surface === "dark" ? "warmWhite" : "navy", bold: true, valign: "top", lineSpacing: 1.1 },
  ...opts,
});

const bodyStyle = (surface: Surface, sizePt = 16, bullets = true): PhStyle => ({
  font: "body", sizePt, color: surface === "dark" ? "warmWhite" : "navy", bullets, valign: "top", lineSpacing: 1.25, paraSpaceAfterPt: 8,
});

function cols(n: number, gap: number, y: number, h: number): Area[] {
  const w = (CW - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: M + i * (w + gap), y, w, h }));
}

function cardsLayout(n: number): LayoutDef {
  const gap = n === 3 ? 0.15 : 0.13;
  const areas = cols(n, gap, 1.95, 3.0);
  const titlePt = n === 3 ? 18 : 14;
  const bodyPt = n === 3 ? 13 : 12;
  const pad = n === 3 ? 0.22 : 0.16;
  const placeholders: Placeholder[] = [eyebrow("light"), slideTitle("light")];
  const decor: Decor[] = [];
  areas.forEach((a, i) => {
    const n2 = String(i + 1).padStart(2, "0");
    decor.push({ kind: "rect", x: a.x, y: a.y, w: a.w, h: a.h, fill: "warmWhite", radius: 0.16, lineColor: "gold", lineTransparency: 70, lineWidthPt: 1 });
    placeholders.push(
      { key: `card${i + 1}Number`, kind: "body", x: a.x + pad, y: a.y + 0.2, w: a.w - 2 * pad, h: 0.3, prompt: n2, style: { font: "body", sizePt: 12, color: "gold", bold: true, caps: true } },
      { key: `card${i + 1}Title`, kind: "body", x: a.x + pad, y: a.y + 0.52, w: a.w - 2 * pad, h: 0.62, prompt: "Tytuł karty", style: { font: "heading", sizePt: titlePt, color: "navy", bold: true, valign: "top", lineSpacing: 1.1 } },
      { key: `card${i + 1}Body`, kind: "body", x: a.x + pad, y: a.y + 1.16, w: a.w - 2 * pad, h: a.h - 1.36, prompt: "Treść karty", style: { font: "body", sizePt: bodyPt, color: "mutedOnLight", valign: "top", lineSpacing: 1.3 } },
    );
  });
  return { id: `cards-${n}`, name: `C2C · Karty ${n}`, surface: "light", background: "light", footer: true, placeholders, decor };
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "cover", name: "C2C · Okładka", surface: "dark", background: "dark", footer: false,
    decor: [
      { kind: "image", asset: "logos.twoLinesWarmWhite", x: M, y: 0.5, w: 1.62, h: 0.35 },
      { kind: "rect", x: M, y: 2.0, w: 0.8, h: 0.045, fill: "gold", radius: 0.02 },
    ],
    placeholders: [
      { key: "title", kind: "title", x: M, y: 2.15, w: CW, h: 1.5, prompt: "Tytuł prezentacji", style: { font: "heading", sizePt: 40, color: "warmWhite", bold: true, valign: "top", lineSpacing: 1.05 } },
      { key: "subtitle", kind: "body", x: M, y: 3.8, w: 8, h: 0.7, prompt: "Podtytuł", style: { font: "heading", sizePt: 20, color: "cream", valign: "top", lineSpacing: 1.2 } },
      { key: "meta", kind: "body", x: M, y: 4.75, w: 8, h: 0.35, prompt: "Data · Miejsce", style: { font: "body", sizePt: 12, color: "cream", valign: "bottom" } },
    ],
  },
  {
    id: "section", name: "C2C · Sekcja", surface: "dark", background: "dark", footer: true,
    decor: [],
    placeholders: [
      { key: "watermark", kind: "body", x: 6.2, y: 0.35, w: 3.4, h: 2.4, prompt: "01", style: { font: "heading", sizePt: 150, color: "watermarkOnDark", bold: true, align: "right", valign: "top", lineSpacing: 1 } },
      { key: "number", kind: "body", x: M, y: 1.95, w: 3, h: 0.3, prompt: "01", style: { font: "body", sizePt: 12, color: "gold", bold: true, caps: true, valign: "bottom" } },
      { key: "title", kind: "title", x: M, y: 2.3, w: 5.6, h: 1.5, prompt: "Tytuł sekcji", style: { font: "heading", sizePt: 38, color: "warmWhite", bold: true, valign: "top", lineSpacing: 1.05 } },
      { key: "subtitle", kind: "body", x: M, y: 3.9, w: 5.6, h: 0.7, prompt: "Podtytuł sekcji", style: { font: "heading", sizePt: 18, color: "cream", valign: "top" } },
    ],
  },
  {
    id: "statement", name: "C2C · Teza", surface: "light", background: "light", footer: true,
    decor: [{ kind: "rect", x: M, y: 1.1, w: 0.45, h: 0.03, fill: "gold" }],
    placeholders: [
      eyebrow("light", 1.25),
      { key: "title", kind: "title", x: M, y: 1.65, w: CW, h: 2.2, prompt: "Jedna mocna teza w maksymalnie trzech linijkach", style: { font: "heading", sizePt: 34, color: "navy", bold: true, valign: "top", lineSpacing: 1.1 } },
      { key: "lead", kind: "body", x: M, y: 3.95, w: 8, h: 0.9, prompt: "Rozwinięcie tezy", style: { font: "body", sizePt: 18, color: "mutedOnLight", valign: "top", lineSpacing: 1.3 } },
    ],
  },
  {
    id: "bullets", name: "C2C · Treść", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [
      eyebrow("light"), slideTitle("light"),
      { key: "body", kind: "body", x: M, y: 1.95, w: CW, h: 3.0, prompt: "Punkty", style: bodyStyle("light") },
    ],
  },
  {
    id: "two-column", name: "C2C · Dwie kolumny", surface: "light", background: "light", footer: true,
    decor: [{ kind: "line", x: 4.98, y: 2.0, w: 0, h: 2.85, color: "gold", transparency: 75, widthPt: 1 }],
    placeholders: [
      eyebrow("light"), slideTitle("light"),
      { key: "leftHeading", kind: "body", x: M, y: 1.95, w: 4.2, h: 0.45, prompt: "Nagłówek lewy", style: { font: "heading", sizePt: 20, color: "navy", bold: true, valign: "top" } },
      { key: "leftBody", kind: "body", x: M, y: 2.45, w: 4.2, h: 2.5, prompt: "Treść lewa", style: bodyStyle("light", 15) },
      { key: "rightHeading", kind: "body", x: 5.3, y: 1.95, w: 4.2, h: 0.45, prompt: "Nagłówek prawy", style: { font: "heading", sizePt: 20, color: "navy", bold: true, valign: "top" } },
      { key: "rightBody", kind: "body", x: 5.3, y: 2.45, w: 4.2, h: 2.5, prompt: "Treść prawa", style: bodyStyle("light", 15) },
    ],
  },
  {
    id: "text-image", name: "C2C · Tekst i zdjęcie", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [
      eyebrow("light"),
      slideTitle("light", { w: 5.2, style: { font: "heading", sizePt: 26, color: "navy", bold: true, valign: "top", lineSpacing: 1.1 } }),
      { key: "body", kind: "body", x: M, y: 1.95, w: 5.0, h: 3.0, prompt: "Treść", style: bodyStyle("light", 15) },
      { key: "image", kind: "pic", x: 6.0, y: 0.55, w: 3.5, h: 4.45, prompt: "Zdjęcie" },
    ],
  },
  cardsLayout(3),
  cardsLayout(4),
  {
    id: "numbers", name: "C2C · Liczby", surface: "dark", background: "dark", footer: true,
    decor: cols(3, 0.15, 2.05, 0).map((a) => ({ kind: "line" as const, x: a.x, y: 2.05, w: a.w, h: 0, color: "gold", transparency: 60, widthPt: 1 })),
    placeholders: [
      eyebrow("dark"), slideTitle("dark"),
      ...cols(3, 0.15, 2.2, 1.2).flatMap((a, i) => [
        { key: `value${i + 1}`, kind: "body" as const, x: a.x, y: a.y, w: a.w, h: 1.2, prompt: "00", style: { font: "heading" as const, sizePt: 64, color: "gold", bold: true, valign: "top" as const, lineSpacing: 1 } },
        { key: `label${i + 1}`, kind: "body" as const, x: a.x, y: 3.45, w: a.w, h: 1.1, prompt: "Opis liczby", style: { font: "body" as const, sizePt: 14, color: "cream", valign: "top" as const, lineSpacing: 1.3 } },
      ]),
    ],
  },
  {
    id: "table", name: "C2C · Tabela", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [eyebrow("light"), slideTitle("light")],
    contentArea: { x: M, y: 1.95, w: CW, h: 3.0 },
  },
  {
    id: "quote-dark", name: "C2C · Cytat ciemny", surface: "dark", background: "dark", footer: true,
    decor: [{ kind: "image", asset: "icon:quote:gold", x: M, y: 1.15, w: 0.5, h: 0.5 }],
    placeholders: [
      { key: "quote", kind: "body", x: M, y: 1.85, w: CW, h: 2.2, prompt: "Cytat", style: { font: "heading", sizePt: 26, color: "warmWhite", italic: true, valign: "top", lineSpacing: 1.25 } },
      { key: "attribution", kind: "body", x: M, y: 4.2, w: CW, h: 0.35, prompt: "- AUTOR", style: { font: "body", sizePt: 12, color: "gold", bold: true, caps: true } },
    ],
  },
  {
    id: "quote-light", name: "C2C · Cytat jasny", surface: "light", background: "light", footer: true,
    decor: [{ kind: "image", asset: "icon:quote:gold", x: M, y: 1.15, w: 0.5, h: 0.5 }],
    placeholders: [
      { key: "quote", kind: "body", x: M, y: 1.85, w: CW, h: 2.2, prompt: "Cytat", style: { font: "heading", sizePt: 26, color: "navy", italic: true, valign: "top", lineSpacing: 1.25 } },
      { key: "attribution", kind: "body", x: M, y: 4.2, w: CW, h: 0.35, prompt: "- AUTOR", style: { font: "body", sizePt: 12, color: "gold", bold: true, caps: true } },
    ],
  },
  {
    id: "chart", name: "C2C · Wykres", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [
      eyebrow("light"), slideTitle("light"),
      { key: "source", kind: "body", x: M, y: 4.85, w: 7, h: 0.25, prompt: "Źródło", style: { font: "body", sizePt: 10, color: "mutedOnLight", valign: "bottom" } },
    ],
    contentArea: { x: M, y: 1.95, w: CW, h: 2.85 },
  },
  {
    id: "diagram", name: "C2C · Diagram", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [eyebrow("light"), slideTitle("light")],
    contentArea: { x: M, y: 1.95, w: CW, h: 3.0 },
  },
  {
    id: "diagram-dark", name: "C2C · Diagram ciemny", surface: "dark", background: "dark", footer: true,
    decor: [],
    placeholders: [eyebrow("dark"), slideTitle("dark")],
    contentArea: { x: M, y: 1.95, w: CW, h: 3.0 },
  },
  {
    id: "photo", name: "C2C · Zdjęcie", surface: "dark", background: "none", footer: false,
    // scrim, tytuł i podpis są rysowane natywnie NAD obrazem (kompozytor), bo obraz slajdu przykrywa elementy layoutu
    decor: [],
    placeholders: [
      { key: "image", kind: "pic", x: 0, y: 0, w: W, h: H, prompt: "Zdjęcie pełnoekranowe" },
      { key: "title", kind: "title", x: M, y: 3.85, w: CW, h: 0.9, prompt: "Tytuł na zdjęciu", style: { font: "heading", sizePt: 30, color: "warmWhite", bold: true, valign: "bottom" } },
      { key: "caption", kind: "body", x: M, y: 4.8, w: CW, h: 0.35, prompt: "Podpis", style: { font: "body", sizePt: 12, color: "cream" } },
    ],
  },
  {
    id: "people", name: "C2C · Osoby", surface: "light", background: "light", footer: true,
    decor: [],
    placeholders: [
      eyebrow("light"), slideTitle("light"),
      ...cols(3, 0.15, 1.95, 2.2).flatMap((a, i) => {
        const pw = 1.76; // 4:5
        return [
          { key: `person${i + 1}Image`, kind: "pic" as const, x: a.x + (a.w - pw) / 2, y: 1.95, w: pw, h: 2.2, prompt: "Portret" },
          { key: `person${i + 1}Name`, kind: "body" as const, x: a.x, y: 4.25, w: a.w, h: 0.35, prompt: "Imię i nazwisko", style: { font: "heading" as const, sizePt: 16, color: "navy", bold: true, align: "center" as const } },
          { key: `person${i + 1}Role`, kind: "body" as const, x: a.x, y: 4.6, w: a.w, h: 0.4, prompt: "Rola", style: { font: "body" as const, sizePt: 12, color: "gold", bold: true, align: "center" as const, valign: "top" as const } },
        ];
      }),
    ],
  },
  {
    id: "closing", name: "C2C · Zamknięcie", surface: "dark", background: "dark", footer: false,
    decor: [
      { kind: "image", asset: "logos.twoLinesWarmWhite", x: M, y: 0.5, w: 1.62, h: 0.35 },
      { kind: "rect", x: M, y: 1.75, w: 0.8, h: 0.045, fill: "gold", radius: 0.02 },
    ],
    placeholders: [
      { key: "title", kind: "title", x: M, y: 1.95, w: CW, h: 1.2, prompt: "Co możemy wspólnie stworzyć?", style: { font: "heading", sizePt: 36, color: "warmWhite", bold: true, valign: "top", lineSpacing: 1.1 } },
      { key: "subtitle", kind: "body", x: M, y: 3.2, w: 8, h: 0.6, prompt: "Podtytuł", style: { font: "heading", sizePt: 18, color: "cream", valign: "top" } },
      { key: "contacts", kind: "body", x: M, y: 3.95, w: 8, h: 1.0, prompt: "kontakt@createdtocreate.pl", style: { font: "body", sizePt: 14, color: "warmWhite", valign: "top", lineSpacing: 1.4 } },
    ],
  },
];

export const LAYOUT_BY_ID: Record<string, LayoutDef> = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

export function layout(id: string): LayoutDef {
  const l = LAYOUT_BY_ID[id];
  if (!l) throw new Error(`Nieznany layout "${id}". Dostępne: ${LAYOUTS.map((x) => x.id).join(", ")}`);
  return l;
}

/** Stopka: logo + numer slajdu (wspólne dla layoutów z footer: true). */
export const FOOTER = {
  logo: { x: M, y: 5.17, h: 0.18, aspect: 11.21 },
  slideNumber: { x: 8.9, y: 5.12, w: 0.6, h: 0.3, sizePt: 10 },
};
