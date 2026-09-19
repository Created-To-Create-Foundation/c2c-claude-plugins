/**
 * Fallback: DeckSpec -> plik .pptx z tym samym szablonem i tym samym kompozytorem.
 * Użytkownik wgrywa plik na Dysk Google i otwiera w Slides (konwersja automatyczna).
 */
import { PptxGenCtor, type PptxGen } from "./pptxgen.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { LAYOUTS } from "../brand/layouts.js";
import { tokens, hex6 } from "../brand/tokens.js";
import { defineLayout } from "../template/build-template.js";
import { compose } from "../render/compose.js";
import type { DeckSpec } from "../spec/deck-spec.js";
import type { Primitive, Paragraph } from "../render/primitives.js";

type Slide = ReturnType<PptxGen["addSlide"]>;

const runs = (paragraphs: Paragraph[]) => paragraphs.map((p, i) => ({
  text: p.text,
  options: {
    bullet: p.bullet ? (p.level ? { indent: 12 } : { indent: 14 }) : false,
    indentLevel: p.level ?? 0,
    breakLine: i < paragraphs.length - 1,
    bold: p.bold || undefined,
  },
}));

function blend(fg: string, bg: string, alpha: number): string {
  const f = fg.replace("#", ""), b = bg.replace("#", "");
  const ch = (i: number) => Math.round(alpha * parseInt(f.slice(i, i + 2), 16) + (1 - alpha) * parseInt(b.slice(i, i + 2), 16)).toString(16).padStart(2, "0");
  return `${ch(0)}${ch(2)}${ch(4)}`.toUpperCase();
}

function addPrimitive(pptx: PptxGen, slide: Slide, prim: Primitive, surface: "dark" | "light"): void {
  const t = tokens();
  const bg = surface === "dark" ? t.colors.navy : t.colors.warmWhite;
  switch (prim.kind) {
    case "rect":
      slide.addShape(prim.radiusIn ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        x: prim.x, y: prim.y, w: prim.w, h: prim.h,
        fill: prim.fill ? { color: hex6(prim.fill), transparency: Math.round((1 - (prim.fillAlpha ?? 1)) * 100) } : { color: hex6(bg), transparency: 100 },
        line: prim.stroke ? { color: hex6(prim.stroke), width: prim.strokeWidthPt ?? 1, transparency: Math.round((1 - (prim.strokeAlpha ?? 1)) * 100) } : { color: hex6(bg), width: 0, transparency: 100 },
        rectRadius: prim.radiusIn ? Math.min(prim.radiusIn, Math.min(prim.w, prim.h) / 2) : undefined,
      });
      break;
    case "ellipse":
      slide.addShape(pptx.ShapeType.ellipse, {
        x: prim.x, y: prim.y, w: prim.w, h: prim.h,
        fill: prim.fill ? { color: hex6(prim.fill), transparency: Math.round((1 - (prim.fillAlpha ?? 1)) * 100) } : { color: hex6(bg), transparency: 100 },
        line: prim.stroke ? { color: hex6(prim.stroke), width: prim.strokeWidthPt ?? 1 } : { color: hex6(bg), width: 0, transparency: 100 },
      });
      break;
    case "line": {
      const x = Math.min(prim.x1, prim.x2), y = Math.min(prim.y1, prim.y2);
      const w = Math.abs(prim.x2 - prim.x1), h = Math.abs(prim.y2 - prim.y1);
      slide.addShape(pptx.ShapeType.line, { x, y, w, h, flipV: (prim.x2 - prim.x1) * (prim.y2 - prim.y1) < 0, line: { color: hex6(prim.color), width: prim.widthPt ?? 1, transparency: Math.round((1 - (prim.alpha ?? 1)) * 100), dashType: prim.dash ? "dash" : "solid" } });
      break;
    }
    case "text": {
      const paragraphs = prim.caps ? prim.paragraphs.map((p) => ({ ...p, text: p.text.toUpperCase() })) : prim.paragraphs;
      slide.addText(runs(paragraphs), {
        x: prim.x, y: prim.y, w: prim.w, h: prim.h, margin: 0,
        fontFace: prim.font === "heading" ? t.fonts.heading : t.fonts.body, fontSize: prim.sizePt, color: hex6(prim.color),
        bold: !!prim.bold, italic: !!prim.italic, align: prim.align ?? "left", valign: prim.valign ?? "top", lineSpacingMultiple: prim.lineSpacing ?? 1.15, fit: "none",
      });
      break;
    }
    case "image":
      slide.addImage({ data: `image/png;base64,${prim.png.toString("base64")}`, x: prim.x, y: prim.y, w: prim.w, h: prim.h, altText: prim.description ?? prim.alt });
      break;
    case "table": {
      const fg = surface === "dark" ? t.colors.warmWhite : t.colors.navy;
      const hair = blend(surface === "dark" ? t.colors.warmWhite : t.colors.gold, bg, 0.25);
      const highlight = blend(surface === "dark" ? t.colors.scrim : t.colors.cream, bg, 0.25);
      const fontSize = prim.rows.length > 6 ? 11 : 13;
      const header = prim.columns.map((c, ci) => ({ text: c.toUpperCase(), options: { bold: true, color: hex6(t.colors.gold), fontSize: 10, align: (prim.numericCols?.includes(ci) ? "right" : "left") as "left" | "right", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: hair }, { type: "none" }] as never } }));
      const body = prim.rows.map((row, ri) => row.map((cell, ci) => ({ text: cell, options: { color: hex6(fg), bold: ci === 0, fontSize, align: (prim.numericCols?.includes(ci) ? "right" : "left") as "left" | "right", fill: prim.highlightRow === ri ? { color: highlight } : undefined, border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: hair }, { type: "none" }] as never } })));
      const total = (prim.colWidths ?? Array(prim.columns.length).fill(1)).reduce((a, b) => a + b, 0);
      const colW = (prim.colWidths ?? Array(prim.columns.length).fill(1)).map((w) => (w / total) * prim.w);
      slide.addTable([header, ...body], { x: prim.x, y: prim.y, w: prim.w, colW, fontFace: t.fonts.body, valign: "middle", margin: [0.06, 0.08, 0.06, 0.08], rowH: Math.max(0.3, prim.h / (prim.rows.length + 1)), autoPage: false });
      break;
    }
  }
}

export async function renderPptx(spec: DeckSpec, outPath: string): Promise<string> {
  const t = tokens();
  const pptx = new PptxGenCtor();
  pptx.layout = "LAYOUT_16x9";
  pptx.theme = { headFontFace: t.fonts.heading, bodyFontFace: t.fonts.body };
  pptx.title = spec.title;
  pptx.author = "Created to Create";
  for (const l of LAYOUTS) defineLayout(pptx, l);

  for (let i = 0; i < spec.slides.length; i++) {
    const composed = await compose(spec.slides[i], i + 1);
    const slide = pptx.addSlide({ masterName: composed.layout.name });
    for (const ph of composed.layout.placeholders) {
      if (ph.kind === "pic") {
        const png = composed.images[ph.key];
        if (png) slide.addImage({ data: `image/png;base64,${png.toString("base64")}`, placeholder: ph.key, x: ph.x, y: ph.y, w: ph.w, h: ph.h });
        continue;
      }
      const paragraphs = composed.texts[ph.key];
      if (paragraphs?.length) slide.addText(runs(paragraphs), { placeholder: ph.key });
    }
    for (const prim of composed.primitives) addPrimitive(pptx, slide, prim, composed.layout.surface);
    if (composed.notes) slide.addNotes(composed.notes);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  await pptx.writeFile({ fileName: outPath });
  return outPath;
}
