/**
 * Kompozytor: SlideSpec -> (layout, teksty placeholderów, obrazy placeholderów, prymitywy natywne, notatki).
 * Jedyne miejsce, gdzie decyduje się "jak wygląda" dany typ slajdu. Oba renderery są cienkie.
 */
import { layout as layoutDef, type LayoutDef, type Area } from "../brand/layouts.js";
import { tokens, iconPath } from "../brand/tokens.js";
import { bulletText, layoutIdFor, type SlideSpec, type ImageRef, type BulletItem, type DiagramSpec, type ChartSpec } from "../spec/deck-spec.js";
import { layoutChart } from "../charts/svg.js";
import { svgToPng } from "../charts/png.js";
import { coverCrop, loadImage } from "./images.js";
import { PT_PER_IN, type Paragraph, type Primitive } from "./primitives.js";

export interface ComposedSlide {
  layout: LayoutDef;
  texts: Record<string, Paragraph[]>;
  images: Record<string, Buffer>; // klucz placeholdera "pic" -> PNG dopasowany do aspektu
  primitives: Primitive[];
  notes?: string;
  /** dla wykresów: spec zapisany w alt-text obrazu (do późniejszej edycji) */
  meta?: Record<string, unknown>;
}

const P = (text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ text, ...extra });

function bulletsToParagraphs(items: BulletItem[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const it of items) {
    const { text, sub } = bulletText(it);
    out.push(P(text, { bullet: true, level: 0 }));
    for (const s of sub) out.push(P(s, { bullet: true, level: 1 }));
  }
  return out;
}

const font = (k: "heading" | "body") => k;

/** "#RRGGBBAA" -> { hex: "#RRGGBB", alpha } (kolory serii wyciszonych mają kanał alfa). */
function splitAlpha(color: string): { hex: string; alpha: number } {
  return color.length === 9 ? { hex: color.slice(0, 7), alpha: parseInt(color.slice(7, 9), 16) / 255 } : { hex: color, alpha: 1 };
}

export async function compose(slide: SlideSpec, index: number): Promise<ComposedSlide> {
  const l = layoutDef(layoutIdFor(slide));
  const c: ComposedSlide = { layout: l, texts: {}, images: {}, primitives: [], notes: slide.notes };
  const t = tokens();

  switch (slide.type) {
    case "cover":
      c.texts.title = [P(slide.title)];
      if (slide.subtitle) c.texts.subtitle = [P(slide.subtitle)];
      if (slide.meta) c.texts.meta = [P(slide.meta)];
      break;
    case "section": {
      const n = slide.number ?? String(index).padStart(2, "0");
      c.texts.watermark = [P(n)];
      c.texts.number = [P(n)];
      c.texts.title = [P(slide.title)];
      if (slide.subtitle) c.texts.subtitle = [P(slide.subtitle)];
      break;
    }
    case "statement":
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      if (slide.lead) c.texts.lead = [P(slide.lead)];
      break;
    case "bullets":
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      c.texts.body = bulletsToParagraphs(slide.bullets);
      break;
    case "two-column":
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      if (slide.left.heading) c.texts.leftHeading = [P(slide.left.heading)];
      c.texts.leftBody = bulletsToParagraphs(slide.left.bullets);
      if (slide.right.heading) c.texts.rightHeading = [P(slide.right.heading)];
      c.texts.rightBody = bulletsToParagraphs(slide.right.bullets);
      break;
    case "text-image": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      c.texts.body = bulletsToParagraphs(slide.bullets);
      const ph = l.placeholders.find((p) => p.key === "image")!;
      c.images.image = await coverCrop(await loadImage(slide.image), ph.w / ph.h);
      break;
    }
    case "cards":
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      slide.cards.forEach((card, i) => {
        c.texts[`card${i + 1}Number`] = [P(String(i + 1).padStart(2, "0"))];
        c.texts[`card${i + 1}Title`] = [P(card.title)];
        c.texts[`card${i + 1}Body`] = [P(card.body)];
      });
      break;
    case "numbers":
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      slide.items.forEach((it, i) => {
        c.texts[`value${i + 1}`] = [P(it.value)];
        c.texts[`label${i + 1}`] = [P(it.label)];
      });
      break;
    case "agenda": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      const a = l.contentArea!;
      const hasTime = slide.items.some((i) => i.time);
      const hasDetail = slide.items.some((i) => i.detail);
      const columns = [hasTime ? "Godzina" : null, "Punkt programu", hasDetail ? "Szczegóły" : null].filter((x): x is string => !!x);
      const rows = slide.items.map((i) => [hasTime ? (i.time ?? "") : null, i.label, hasDetail ? (i.detail ?? "") : null].filter((x): x is string => x !== null));
      const colWidths = columns.length === 3 ? [1.4, 3.6, 4.0] : columns.length === 2 && hasTime ? [1.6, 7.4] : columns.length === 2 ? [3.6, 5.4] : [9];
      c.primitives.push({ kind: "table", x: a.x, y: a.y, w: a.w, h: a.h, columns, rows, surface: "light", colWidths });
      break;
    }
    case "table": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      const a = l.contentArea!;
      const numericCols = slide.columns.map((_, ci) => ci).filter((ci) => ci > 0 && slide.rows.every((r) => /^[\d\s.,%zł€$+-]+$/.test(r[ci] ?? "")));
      c.primitives.push({ kind: "table", x: a.x, y: a.y, w: a.w, h: a.h, columns: slide.columns, rows: slide.rows, surface: "light", highlightRow: slide.highlightRow, numericCols });
      break;
    }
    case "quote":
      c.texts.quote = [P(`„${slide.quote.replace(/^[„"]|["”]$/g, "")}”`)];
      if (slide.attribution) c.texts.attribution = [P(`- ${slide.attribution.toUpperCase()}`)];
      break;
    case "chart": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      if (slide.source) c.texts.source = [P(`Źródło: ${slide.source}`)];
      c.primitives.push(...(await chartPrimitives(slide.chart, l.contentArea!, "light")));
      c.meta = { c2cChart: slide.chart };
      break;
    }
    case "diagram": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      c.primitives.push(...(await diagramPrimitives(slide.diagram, l.contentArea!, slide.surface)));
      break;
    }
    case "photo": {
      const ph = l.placeholders.find((p) => p.key === "image")!;
      c.images.image = await coverCrop(await loadImage(slide.image), ph.w / ph.h, 1920);
      // warstwy nad obrazem: scrim + tytuł + podpis (placeholdery tekstowe layoutu zostają puste i są usuwane)
      if (slide.title || slide.caption) {
        c.primitives.push({ kind: "rect", x: 0, y: 3.3, w: 10, h: 2.325, fill: t.colors.scrim, fillAlpha: 0.75 });
        if (slide.title) c.primitives.push({ kind: "text", x: 0.5, y: 3.85, w: 9, h: 0.9, paragraphs: [P(slide.title)], font: "heading", sizePt: 30, color: t.colors.warmWhite, bold: true, valign: "bottom" });
        if (slide.caption) c.primitives.push({ kind: "text", x: 0.5, y: 4.8, w: 9, h: 0.35, paragraphs: [P(slide.caption)], font: "body", sizePt: 12, color: t.colors.cream });
      }
      break;
    }
    case "people": {
      if (slide.eyebrow) c.texts.eyebrow = [P(slide.eyebrow.toUpperCase())];
      c.texts.title = [P(slide.title)];
      for (let i = 0; i < slide.people.length; i++) {
        const p = slide.people[i];
        c.texts[`person${i + 1}Name`] = [P(p.name)];
        c.texts[`person${i + 1}Role`] = [P(p.role)];
        if (p.image) {
          const ph = l.placeholders.find((x) => x.key === `person${i + 1}Image`)!;
          c.images[`person${i + 1}Image`] = await coverCrop(await loadImage(p.image), ph.w / ph.h, 800);
        }
      }
      break;
    }
    case "closing":
      c.texts.title = [P(slide.title)];
      if (slide.subtitle) c.texts.subtitle = [P(slide.subtitle)];
      if (slide.contacts?.length) c.texts.contacts = slide.contacts.map((x) => P(x));
      break;
  }
  return c;
}

// ---------- wykresy ----------

async function chartPrimitives(spec: ChartSpec, area: Area, surface: "dark" | "light"): Promise<Primitive[]> {
  const t = tokens();
  const legendCount = spec.type === "donut" ? spec.categories.length : spec.series.length > 1 ? spec.series.length : 0;
  const lay = layoutChart(spec, { widthPt: area.w * PT_PER_IN, heightPt: area.h * PT_PER_IN, surface });
  const png = await svgToPng(lay.svg, 3);
  const ox = area.x, oy = area.y;
  const toIn = (pt: number) => pt / PT_PER_IN;
  const prims: Primitive[] = [];
  const labelColor = surface === "dark" ? t.colors.warmWhite : t.colors.navy;
  const muted = surface === "dark" ? t.colors.cream : t.colors.mutedOnLight;
  prims.push({ kind: "image", x: ox, y: oy, w: area.w, h: area.h, png, alt: `Wykres: ${spec.type}`, description: JSON.stringify({ c2cChart: spec }) });
  for (const g of lay.gridLabels) prims.push({ kind: "text", x: ox + toIn(g.x), y: oy + toIn(g.y), w: toIn(g.w), h: toIn(16), paragraphs: [P(g.text)], font: "body", sizePt: 10, color: muted, align: spec.type === "bar" ? "center" : "right", valign: "middle" });
  for (const g of lay.categoryLabels) prims.push({ kind: "text", x: ox + toIn(g.x), y: oy + toIn(g.y), w: toIn(g.w), h: toIn(18), paragraphs: [P(g.text)], font: "body", sizePt: 11, color: labelColor, align: spec.type === "bar" ? "right" : "center", valign: "top" });
  for (const v of lay.valueLabels) prims.push({ kind: "text", x: ox + toIn(v.x), y: oy + toIn(v.y), w: toIn(v.w), h: toIn(16), paragraphs: [P(v.text)], font: "body", sizePt: 11, color: v.color, bold: true, align: v.align, valign: "middle" });
  if (lay.center) {
    prims.push({ kind: "text", x: ox + toIn(lay.center.x) - 0.8, y: oy + toIn(lay.center.y) - 0.28, w: 1.6, h: 0.4, paragraphs: [P(lay.center.text)], font: "heading", sizePt: 26, color: labelColor, bold: true, align: "center", valign: "middle" });
    prims.push({ kind: "text", x: ox + toIn(lay.center.x) - 0.8, y: oy + toIn(lay.center.y) + 0.12, w: 1.6, h: 0.25, paragraphs: [P("RAZEM")], font: "body", sizePt: 10, color: t.colors.gold, bold: true, align: "center", valign: "top", caps: true });
  }
  // Legenda: donut po prawej (pionowo), pozostałe u góry (poziomo)
  if (legendCount) {
    if (spec.type === "donut") {
      const lx = ox + toIn(lay.plot.x + lay.plot.w) + 0.4;
      lay.legend.forEach((item, i) => {
        const ly = oy + 0.35 + i * 0.36;
        const sw = splitAlpha(item.color);
        prims.push({ kind: "ellipse", x: lx, y: ly + 0.04, w: 0.14, h: 0.14, fill: sw.hex, fillAlpha: sw.alpha });
        prims.push({ kind: "text", x: lx + 0.24, y: ly - 0.02, w: area.w - (lx - ox) - 0.3, h: 0.28, paragraphs: [P(item.name)], font: "body", sizePt: 12, color: labelColor, valign: "middle" });
      });
    } else {
      let lx = ox;
      lay.legend.forEach((item) => {
        const sw = splitAlpha(item.color);
        prims.push({ kind: "rect", x: lx, y: oy + 0.06, w: 0.14, h: 0.14, fill: sw.hex, fillAlpha: sw.alpha, radiusIn: 0.02 });
        const w = Math.min(2.6, 0.45 + item.name.length * 0.09);
        prims.push({ kind: "text", x: lx + 0.2, y: oy, w, h: 0.26, paragraphs: [P(item.name)], font: "body", sizePt: 11, color: labelColor, valign: "middle" });
        lx += 0.2 + w + 0.15;
      });
    }
  }
  return prims;
}

// ---------- diagramy ----------

async function diagramPrimitives(d: DiagramSpec, area: Area, surface: "dark" | "light"): Promise<Primitive[]> {
  const t = tokens();
  const c = t.colors;
  const fg = surface === "dark" ? c.warmWhite : c.navy;
  const muted = surface === "dark" ? c.cream : c.mutedOnLight;
  const cardFill = surface === "dark" ? c.scrim : c.cardOnLight;
  const cardAlpha = surface === "dark" ? 0.25 : 1;
  const prims: Primitive[] = [];

  if (d.type === "process") {
    const n = d.steps.length;
    const gap = 0.25;
    const w = (area.w - gap * (n - 1)) / n;
    d.steps.forEach((s, i) => {
      const x = area.x + i * (w + gap);
      const cy = area.y + 0.45;
      prims.push({ kind: "ellipse", x: x, y: cy - 0.22, w: 0.44, h: 0.44, fill: c.gold });
      prims.push({ kind: "text", x: x, y: cy - 0.22, w: 0.44, h: 0.44, paragraphs: [P(String(i + 1))], font: "heading", sizePt: 14, color: c.navy, bold: true, align: "center", valign: "middle" });
      if (i < n - 1) prims.push({ kind: "line", x1: x + 0.52, y1: cy, x2: x + w + gap - 0.08, y2: cy, color: c.gold, alpha: 0.5, widthPt: 1 });
      prims.push({ kind: "text", x, y: area.y + 0.9, w, h: 0.6, paragraphs: [P(s.title)], font: "heading", sizePt: 16, color: fg, bold: true, valign: "top", lineSpacing: 1.1 });
      if (s.body) prims.push({ kind: "text", x, y: area.y + 1.5, w, h: area.h - 1.5, paragraphs: [P(s.body)], font: "body", sizePt: 12, color: muted, valign: "top", lineSpacing: 1.3 });
    });
  } else if (d.type === "timeline") {
    const n = d.steps.length;
    const stepW = area.w / n;
    const ly = area.y + 0.95;
    prims.push({ kind: "line", x1: area.x, y1: ly, x2: area.x + area.w, y2: ly, color: c.gold, alpha: 0.5, widthPt: 1 });
    d.steps.forEach((s, i) => {
      const x = area.x + i * stepW;
      const cx = x + 0.12;
      prims.push({ kind: "ellipse", x: cx - 0.09, y: ly - 0.09, w: 0.18, h: 0.18, fill: c.gold });
      prims.push({ kind: "text", x, y: area.y + 0.35, w: stepW - 0.2, h: 0.3, paragraphs: [P(s.label.toUpperCase())], font: "body", sizePt: 11, color: c.gold, bold: true, caps: true, valign: "bottom" });
      prims.push({ kind: "text", x, y: ly + 0.25, w: stepW - 0.25, h: 0.6, paragraphs: [P(s.title)], font: "heading", sizePt: 15, color: fg, bold: true, valign: "top", lineSpacing: 1.1 });
      if (s.body) prims.push({ kind: "text", x, y: ly + 0.85, w: stepW - 0.25, h: area.h - (ly - area.y) - 0.85, paragraphs: [P(s.body)], font: "body", sizePt: 12, color: muted, valign: "top", lineSpacing: 1.3 });
    });
  } else if (d.type === "pillars") {
    const n = d.pillars.length;
    const gap = 0.18;
    const w = (area.w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const p = d.pillars[i];
      const x = area.x + i * (w + gap);
      prims.push({ kind: "rect", x, y: area.y, w, h: area.h, fill: cardFill, fillAlpha: cardAlpha, stroke: c.gold, strokeAlpha: 0.3, strokeWidthPt: 1, radiusIn: 0.16 });
      let ty = area.y + 0.3;
      if (p.icon) {
        try {
          const iconPng = await coverCrop(await loadImage({ path: iconPath(p.icon, surface === "dark" ? "warm-white" : "gold") }), 1, 256);
          prims.push({ kind: "image", x: x + 0.25, y: ty, w: 0.4, h: 0.4, png: iconPng, alt: p.icon });
          ty += 0.6;
        } catch { /* nieznana ikona: pomijamy */ }
      }
      prims.push({ kind: "text", x: x + 0.22, y: ty, w: w - 0.44, h: 0.8, paragraphs: [P(p.title)], font: "heading", sizePt: 15, color: fg, bold: true, valign: "top", lineSpacing: 1.1 });
      if (p.body) prims.push({ kind: "text", x: x + 0.22, y: ty + 0.85, w: w - 0.44, h: area.h - (ty - area.y) - 1.1, paragraphs: [P(p.body)], font: "body", sizePt: 12, color: muted, valign: "top", lineSpacing: 1.3 });
    }
  } else if (d.type === "matrix") {
    const axisW = 0.9;
    const gx = area.x + axisW, gy = area.y + 0.35, gw = area.w - axisW, gh = area.h - 0.7;
    const cw = gw / 2, ch = gh / 2;
    const quads = [[0, 0], [1, 0], [0, 1], [1, 1]];
    quads.forEach(([qx, qy], i) => {
      const x = gx + qx * cw, y = gy + qy * ch;
      prims.push({ kind: "rect", x: x + 0.04, y: y + 0.04, w: cw - 0.08, h: ch - 0.08, fill: i === 1 ? c.gold : cardFill, fillAlpha: i === 1 ? 0.18 : cardAlpha, stroke: c.gold, strokeAlpha: 0.3, strokeWidthPt: 1, radiusIn: 0.12 });
      prims.push({ kind: "text", x: x + 0.25, y: y + 0.2, w: cw - 0.5, h: ch - 0.4, paragraphs: [P(d.quadrants[i])], font: "heading", sizePt: 15, color: fg, bold: true, valign: "top", lineSpacing: 1.15 });
    });
    prims.push({ kind: "text", x: gx, y: gy + gh + 0.08, w: cw, h: 0.25, paragraphs: [P(d.xAxis[0].toUpperCase())], font: "body", sizePt: 10, color: c.gold, bold: true, caps: true, align: "left" });
    prims.push({ kind: "text", x: gx + cw, y: gy + gh + 0.08, w: cw, h: 0.25, paragraphs: [P(d.xAxis[1].toUpperCase())], font: "body", sizePt: 10, color: c.gold, bold: true, caps: true, align: "right" });
    prims.push({ kind: "text", x: area.x, y: gy, w: axisW - 0.1, h: ch, paragraphs: [P(d.yAxis[0].toUpperCase())], font: "body", sizePt: 10, color: c.gold, bold: true, caps: true, align: "right", valign: "top" });
    prims.push({ kind: "text", x: area.x, y: gy + ch, w: axisW - 0.1, h: ch, paragraphs: [P(d.yAxis[1].toUpperCase())], font: "body", sizePt: 10, color: c.gold, bold: true, caps: true, align: "right", valign: "bottom" });
  }
  return prims;
}

export { font };
