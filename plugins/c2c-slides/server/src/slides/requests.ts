/**
 * Prymitywy i teksty -> żądania batchUpdate Slides API.
 */
import { randomBytes } from "node:crypto";
import { tokens, rgb, blend } from "../brand/tokens.js";
import type { Paragraph, Primitive } from "../render/primitives.js";
import { EMU_PER_IN } from "./layout-map.js";

export const genId = (prefix = "el"): string => `c2c_${prefix}_${randomBytes(6).toString("hex")}`;
export const emu = (inches: number): number => Math.round(inches * EMU_PER_IN);

export function elementProps(pageObjectId: string, x: number, y: number, w: number, h: number) {
  return {
    pageObjectId,
    size: { width: { magnitude: Math.max(emu(w), 1), unit: "EMU" }, height: { magnitude: Math.max(emu(h), 1), unit: "EMU" } },
    transform: { scaleX: 1, scaleY: 1, translateX: emu(x), translateY: emu(y), unit: "EMU" },
  };
}

const solid = (hex: string, alpha = 1) => ({ solidFill: { color: { rgbColor: rgb(hex) }, alpha } });
const fontFamily = (k: "heading" | "body") => (k === "heading" ? tokens().fonts.heading : tokens().fonts.body);
const ALIGN: Record<string, string> = { left: "START", center: "CENTER", right: "END" };
const VALIGN: Record<string, string> = { top: "TOP", middle: "MIDDLE", bottom: "BOTTOM" };

/** Zamienia akapity na tekst do insertText; poziomy zagnieżdżenia = wiodące tabulatory (tak liczy Slides). */
export function paragraphsToText(paragraphs: Paragraph[]): string {
  return paragraphs.map((p) => `${"\t".repeat(p.level ?? 0)}${p.text}`).join("\n");
}

/** Wstawia tekst do istniejącego kształtu/placeholdera (czyści poprzednią treść). */
export function textIntoShape(objectId: string, paragraphs: Paragraph[], opts: { clear?: boolean; bullets?: boolean; sizePt?: number } = {}): unknown[] {
  const reqs: unknown[] = [];
  if (opts.clear) reqs.push({ deleteText: { objectId, textRange: { type: "ALL" } } });
  const text = paragraphsToText(paragraphs);
  if (!text) return reqs;
  reqs.push({ insertText: { objectId, insertionIndex: 0, text } });
  const anyBullet = paragraphs.some((p) => p.bullet);
  if (anyBullet || opts.bullets) {
    reqs.push({ createParagraphBullets: { objectId, textRange: { type: "ALL" }, bulletPreset: "BULLET_DISC_CIRCLE_SQUARE" } });
  } else {
    reqs.push({ deleteParagraphBullets: { objectId, textRange: { type: "ALL" } } });
  }
  // pogrubienia pojedynczych akapitów; zagnieżdżone punkty: rozmiar 0.9x (Slides nie dziedziczy stylu poziomu 2 z szablonu)
  // createParagraphBullets USUWA wiodące tabulatory z tekstu, więc indeksy liczymy bez nich
  const tabsConsumed = anyBullet || !!opts.bullets;
  let idx = 0;
  for (const p of paragraphs) {
    const line = tabsConsumed ? p.text : `${"\t".repeat(p.level ?? 0)}${p.text}`;
    const range = { type: "FIXED_RANGE", startIndex: idx, endIndex: idx + line.length };
    if (p.bold) reqs.push({ updateTextStyle: { objectId, textRange: range, style: { bold: true }, fields: "bold" } });
    if ((p.level ?? 0) > 0 && opts.sizePt) reqs.push({ updateTextStyle: { objectId, textRange: range, style: { fontSize: { magnitude: Math.round(opts.sizePt * 0.9), unit: "PT" } }, fields: "fontSize" } });
    idx += line.length + 1;
  }
  return reqs;
}

export function primitiveRequests(pageObjectId: string, prim: Primitive, hostedUrl?: string): unknown[] {
  const t = tokens();
  const reqs: unknown[] = [];
  switch (prim.kind) {
    case "rect": {
      const id = genId("rect");
      const rounded = !!prim.radiusIn && Math.min(prim.w, prim.h) <= 0.6;
      reqs.push({ createShape: { objectId: id, shapeType: rounded ? "ROUND_RECTANGLE" : "RECTANGLE", elementProperties: elementProps(pageObjectId, prim.x, prim.y, prim.w, prim.h) } });
      const shapeProperties: Record<string, unknown> = {};
      const fields: string[] = [];
      if (prim.fill) { shapeProperties.shapeBackgroundFill = solid(prim.fill, prim.fillAlpha ?? 1); fields.push("shapeBackgroundFill.solidFill"); }
      else { shapeProperties.shapeBackgroundFill = { propertyState: "NOT_RENDERED" }; fields.push("shapeBackgroundFill.propertyState"); }
      if (prim.stroke) { shapeProperties.outline = { outlineFill: solid(prim.stroke, prim.strokeAlpha ?? 1), weight: { magnitude: prim.strokeWidthPt ?? 1, unit: "PT" } }; fields.push("outline.outlineFill.solidFill", "outline.weight"); }
      else { shapeProperties.outline = { propertyState: "NOT_RENDERED" }; fields.push("outline.propertyState"); }
      reqs.push({ updateShapeProperties: { objectId: id, shapeProperties, fields: fields.join(",") } });
      break;
    }
    case "ellipse": {
      const id = genId("ell");
      reqs.push({ createShape: { objectId: id, shapeType: "ELLIPSE", elementProperties: elementProps(pageObjectId, prim.x, prim.y, prim.w, prim.h) } });
      const shapeProperties: Record<string, unknown> = { shapeBackgroundFill: prim.fill ? solid(prim.fill, prim.fillAlpha ?? 1) : { propertyState: "NOT_RENDERED" } };
      const fields = [prim.fill ? "shapeBackgroundFill.solidFill" : "shapeBackgroundFill.propertyState"];
      if (prim.stroke) { shapeProperties.outline = { outlineFill: solid(prim.stroke), weight: { magnitude: prim.strokeWidthPt ?? 1, unit: "PT" } }; fields.push("outline.outlineFill.solidFill", "outline.weight"); }
      else { shapeProperties.outline = { propertyState: "NOT_RENDERED" }; fields.push("outline.propertyState"); }
      reqs.push({ updateShapeProperties: { objectId: id, shapeProperties, fields: fields.join(",") } });
      break;
    }
    case "line": {
      const id = genId("line");
      const x = Math.min(prim.x1, prim.x2), y = Math.min(prim.y1, prim.y2);
      const w = Math.abs(prim.x2 - prim.x1), h = Math.abs(prim.y2 - prim.y1);
      const flip = (prim.x2 - prim.x1) * (prim.y2 - prim.y1) < 0;
      const props = elementProps(pageObjectId, x, y, w, h);
      if (flip) { props.transform.scaleY = -1; props.transform.translateY = emu(y + h); }
      reqs.push({ createLine: { objectId: id, lineCategory: "STRAIGHT", elementProperties: props } });
      reqs.push({ updateLineProperties: { objectId: id, lineProperties: { lineFill: solid(prim.color, prim.alpha ?? 1), weight: { magnitude: prim.widthPt ?? 1, unit: "PT" }, dashStyle: prim.dash ? "DASH" : "SOLID" }, fields: "lineFill.solidFill,weight,dashStyle" } });
      break;
    }
    case "text": {
      const id = genId("txt");
      reqs.push({ createShape: { objectId: id, shapeType: "TEXT_BOX", elementProperties: elementProps(pageObjectId, prim.x, prim.y, prim.w, prim.h) } });
      const paragraphs = prim.caps ? prim.paragraphs.map((p) => ({ ...p, text: p.text.toUpperCase() })) : prim.paragraphs;
      reqs.push(...textIntoShape(id, paragraphs));
      reqs.push({
        updateTextStyle: {
          objectId: id, textRange: { type: "ALL" },
          style: { fontFamily: fontFamily(prim.font), fontSize: { magnitude: prim.sizePt, unit: "PT" }, bold: !!prim.bold, italic: !!prim.italic, foregroundColor: { opaqueColor: { rgbColor: rgb(prim.color) } } },
          fields: "fontFamily,fontSize,bold,italic,foregroundColor",
        },
      });
      reqs.push({ updateParagraphStyle: { objectId: id, textRange: { type: "ALL" }, style: { alignment: ALIGN[prim.align ?? "left"], lineSpacing: Math.round((prim.lineSpacing ?? 1.15) * 100), spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" } }, fields: "alignment,lineSpacing,spaceAbove,spaceBelow" } });
      reqs.push({ updateShapeProperties: { objectId: id, shapeProperties: { contentAlignment: VALIGN[prim.valign ?? "top"], autofit: { autofitType: "NONE" } }, fields: "contentAlignment,autofit.autofitType" } });
      break;
    }
    case "image": {
      if (!hostedUrl) throw new Error("Obraz wymaga wcześniejszego hostingu (TempHost).");
      const id = genId("img");
      reqs.push({ createImage: { objectId: id, url: hostedUrl, elementProperties: elementProps(pageObjectId, prim.x, prim.y, prim.w, prim.h) } });
      if (prim.alt || prim.description) reqs.push({ updatePageElementAltText: { objectId: id, title: prim.alt ?? "", description: prim.description ?? "" } });
      break;
    }
    case "table": {
      const id = genId("tbl");
      const rows = prim.rows.length + 1;
      const cols = prim.columns.length;
      const surface = prim.surface;
      const fg = surface === "dark" ? t.colors.warmWhite : t.colors.navy;
      // obramowania tabel nie wspierają alfa (tylko 0 lub 1): kolor włosowy mieszamy z tłem
      const bgHex = surface === "dark" ? t.colors.navy : t.colors.warmWhite;
      const hair = blend(surface === "dark" ? t.colors.warmWhite : t.colors.gold, bgHex, 0.25);
      reqs.push({ createTable: { objectId: id, elementProperties: elementProps(pageObjectId, prim.x, prim.y, prim.w, prim.h), rows, columns: cols } });
      // szerokości kolumn
      const widths = prim.colWidths && prim.colWidths.length === cols ? prim.colWidths : Array(cols).fill(prim.w / cols);
      const scale = prim.w / widths.reduce((a, b) => a + b, 0);
      widths.forEach((w, ci) => reqs.push({ updateTableColumnProperties: { objectId: id, columnIndices: [ci], tableColumnProperties: { columnWidth: { magnitude: Math.round(w * scale * 72), unit: "PT" } }, fields: "columnWidth" } }));
      const rowH = Math.max(0.28, prim.h / rows);
      reqs.push({ updateTableRowProperties: { objectId: id, rowIndices: Array.from({ length: rows }, (_, i) => i), tableRowProperties: { minRowHeight: { magnitude: Math.round(rowH * 72), unit: "PT" } }, fields: "minRowHeight" } });
      // obramowania: wszystko niewidoczne, potem poziome linie włosowe
      reqs.push({ updateTableBorderProperties: { objectId: id, borderPosition: "ALL", tableBorderProperties: { tableBorderFill: solid(hair, 0), weight: { magnitude: 0.5, unit: "PT" } }, fields: "tableBorderFill,weight" } });
      reqs.push({ updateTableBorderProperties: { objectId: id, borderPosition: "INNER_HORIZONTAL", tableBorderProperties: { tableBorderFill: solid(hair, 1), weight: { magnitude: 1, unit: "PT" } }, fields: "tableBorderFill,weight" } });
      reqs.push({ updateTableBorderProperties: { objectId: id, borderPosition: "BOTTOM", tableBorderProperties: { tableBorderFill: solid(hair, 1), weight: { magnitude: 1, unit: "PT" } }, fields: "tableBorderFill,weight" } });
      // komórki: brak wypełnienia, wyśrodkowanie w pionie
      reqs.push({ updateTableCellProperties: { objectId: id, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: rows, columnSpan: cols }, tableCellProperties: { tableCellBackgroundFill: { propertyState: "NOT_RENDERED" }, contentAlignment: "MIDDLE" }, fields: "tableCellBackgroundFill.propertyState,contentAlignment" } });
      if (prim.highlightRow !== undefined && prim.highlightRow < prim.rows.length) {
        reqs.push({ updateTableCellProperties: { objectId: id, tableRange: { location: { rowIndex: prim.highlightRow + 1, columnIndex: 0 }, rowSpan: 1, columnSpan: cols }, tableCellProperties: { tableCellBackgroundFill: solid(surface === "dark" ? t.colors.scrim : t.colors.cream, 0.25) }, fields: "tableCellBackgroundFill.solidFill" } });
      }
      const cell = (r: number, c: number, text: string, style: Record<string, unknown>, fields: string, align: string) => {
        if (!text) return; // API odrzuca stylowanie pustej komórki
        reqs.push({ insertText: { objectId: id, cellLocation: { rowIndex: r, columnIndex: c }, insertionIndex: 0, text } });
        reqs.push({ updateTextStyle: { objectId: id, cellLocation: { rowIndex: r, columnIndex: c }, textRange: { type: "ALL" }, style, fields } });
        reqs.push({ updateParagraphStyle: { objectId: id, cellLocation: { rowIndex: r, columnIndex: c }, textRange: { type: "ALL" }, style: { alignment: align }, fields: "alignment" } });
      };
      prim.columns.forEach((h, ci) => cell(0, ci, h.toUpperCase(), { fontFamily: t.fonts.body, fontSize: { magnitude: 10, unit: "PT" }, bold: true, foregroundColor: { opaqueColor: { rgbColor: rgb(t.colors.gold) } } }, "fontFamily,fontSize,bold,foregroundColor", prim.numericCols?.includes(ci) ? "END" : "START"));
      prim.rows.forEach((row, ri) => row.forEach((val, ci) => {
        if (ci >= cols) return;
        cell(ri + 1, ci, val, { fontFamily: t.fonts.body, fontSize: { magnitude: rows > 7 ? 11 : 13, unit: "PT" }, bold: ci === 0, foregroundColor: { opaqueColor: { rgbColor: rgb(fg) } } }, "fontFamily,fontSize,bold,foregroundColor", prim.numericCols?.includes(ci) ? "END" : "START");
      }));
      break;
    }
  }
  return reqs;
}
