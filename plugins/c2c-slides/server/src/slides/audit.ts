/**
 * Audyt i naprawa spójności brandu w prezentacji:
 *  - slajdy poza layoutami C2C,
 *  - nadpisane style w placeholderach (czcionka / kolor),
 *  - obce czcionki i kolory w dowolnych polach tekstowych,
 *  - schemat kolorów mastera.
 */
import * as api from "../google/api.js";
import { tokens, rgb } from "../brand/tokens.js";
import { themeColorScheme } from "../template/build-template.js";
import { mapLayouts, layoutMapForSlide, slidePlaceholders } from "./layout-map.js";

export interface AuditIssue { slideIndex: number; slideId: string; kind: "off-template" | "style-override" | "foreign-font" | "foreign-color" | "theme-colors"; detail: string; fixed: boolean }
export interface AuditReport { presentationId: string; slidesChecked: number; issues: AuditIssue[]; fixedCount: number; summary: string }

const THEME_MAP: Record<string, string> = { dk1: "DARK1", lt1: "LIGHT1", dk2: "DARK2", lt2: "LIGHT2", accent1: "ACCENT1", accent2: "ACCENT2", accent3: "ACCENT3", accent4: "ACCENT4", accent5: "ACCENT5", accent6: "ACCENT6", hlink: "HYPERLINK", folHlink: "FOLLOWED_HYPERLINK" };

function paletteRgb(): { red: number; green: number; blue: number }[] {
  return Object.values(tokens().colors).map(rgb);
}
function closeTo(a: { red?: number; green?: number; blue?: number }, b: { red: number; green: number; blue: number }, tol = 0.03): boolean {
  return Math.abs((a.red ?? 0) - b.red) < tol && Math.abs((a.green ?? 0) - b.green) < tol && Math.abs((a.blue ?? 0) - b.blue) < tol;
}
function inPalette(c: { red?: number; green?: number; blue?: number }): boolean {
  if (closeTo(c, { red: 1, green: 1, blue: 1 }) || closeTo(c, { red: 0, green: 0, blue: 0 })) return true; // biel/czerń: z konwersji, tolerujemy
  return paletteRgb().some((p) => closeTo(c, p));
}

export async function auditDeck(presentationId: string, fix = false): Promise<AuditReport> {
  const t = tokens();
  const pres = await api.getPresentation(presentationId, "slides(objectId,slideProperties(layoutObjectId,masterObjectId),pageElements),layouts(objectId,layoutProperties,pageElements),masters(objectId,pageProperties)");
  const maps = mapLayouts(pres);
  const issues: AuditIssue[] = [];
  const reqs: unknown[] = [];
  const brandFonts = [t.fonts.heading, t.fonts.body];

  (pres.slides ?? []).forEach((s, i) => {
    const map = layoutMapForSlide(maps, s);
    if (!map) {
      issues.push({ slideIndex: i, slideId: s.objectId, kind: "off-template", detail: "Slajd nie używa layoutu C2C; nie da się go naprawić automatycznie. Odtwórz go jako typ C2C (c2c_add_slides) i usuń stary.", fixed: false });
    }
    const byObjectId: Record<string, string> = {};
    if (map) for (const [key, el] of Object.entries(slidePlaceholders(s, map))) byObjectId[el.objectId] = key;
    for (const el of s.pageElements ?? []) {
      const runs = el.shape?.text?.textElements?.filter((te) => te.textRun && te.textRun.content.trim()) ?? [];
      if (!runs.length) continue;
      const isPlaceholder = !!el.shape?.placeholder;
      const fonts = new Set<string>();
      const badColors: string[] = [];
      for (const te of runs) {
        const st = (te.textRun!.style ?? {}) as { fontFamily?: string; weightedFontFamily?: { fontFamily?: string }; foregroundColor?: { opaqueColor?: { rgbColor?: { red?: number; green?: number; blue?: number }; themeColor?: string } } };
        const fam = st.fontFamily ?? st.weightedFontFamily?.fontFamily;
        if (fam) fonts.add(fam);
        const rgbc = st.foregroundColor?.opaqueColor?.rgbColor;
        if (rgbc && !inPalette(rgbc)) badColors.push(JSON.stringify(rgbc));
      }
      const foreign = [...fonts].filter((f) => !brandFonts.includes(f));
      const phKey = byObjectId[el.objectId];
      const phDef = phKey ? map?.layout.placeholders.find((p) => p.key === phKey) : undefined;
      if (isPlaceholder && phDef?.style && (foreign.length || badColors.length)) {
        // konwersja zapisuje style jawnie w tekście, więc "reset do dziedziczonego" zdjąłby też pogrubienie;
        // zamiast tego ustawiamy jawnie styl z definicji layoutu
        const st = phDef.style;
        issues.push({ slideIndex: i, slideId: s.objectId, kind: "style-override", detail: `Placeholder "${phKey}" ma ręcznie zmienioną czcionkę/kolor (${foreign.join(", ") || "kolor"}). Naprawa: styl z szablonu.`, fixed: fix });
        if (fix) reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: "ALL" }, style: { fontFamily: st.font === "heading" ? t.fonts.heading : t.fonts.body, bold: !!st.bold, italic: !!st.italic, foregroundColor: { opaqueColor: { rgbColor: rgb(t.colors[st.color]) } } }, fields: "fontFamily,bold,italic,foregroundColor" } });
      } else if (!isPlaceholder) {
        if (foreign.length) {
          issues.push({ slideIndex: i, slideId: s.objectId, kind: "foreign-font", detail: `Pole tekstowe używa czcionki poza marką: ${foreign.join(", ")}. Naprawa: ${t.fonts.body}.`, fixed: fix });
          if (fix) reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: "ALL" }, style: { fontFamily: t.fonts.body }, fields: "fontFamily" } });
        }
        if (badColors.length) {
          const surface = map?.layout.surface ?? "light";
          const target = surface === "dark" ? t.colors.warmWhite : t.colors.navy;
          issues.push({ slideIndex: i, slideId: s.objectId, kind: "foreign-color", detail: `Kolor tekstu poza paletą (${badColors.length} fragm.). Naprawa: ${target}.`, fixed: fix });
          if (fix) reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: "ALL" }, style: { foregroundColor: { opaqueColor: { rgbColor: rgb(target) } } }, fields: "foregroundColor" } });
        }
      }
    }
  });

  // schemat kolorów mastera
  const scheme = themeColorScheme();
  for (const m of pres.masters ?? []) {
    const current = m.pageProperties?.colorScheme?.colors ?? [];
    const wrong = Object.entries(scheme).filter(([k, hex]) => {
      const cur = current.find((c) => c.type === THEME_MAP[k]);
      return cur ? !closeTo(cur.color, rgb(hex)) : true;
    });
    if (wrong.length) {
      issues.push({ slideIndex: -1, slideId: m.objectId, kind: "theme-colors", detail: `Schemat kolorów motywu odbiega od marki (${wrong.map(([k]) => k).join(", ")}).`, fixed: fix });
      if (fix) reqs.push({ updatePageProperties: { objectId: m.objectId, pageProperties: { colorScheme: { colors: Object.entries(scheme).map(([k, hex]) => ({ type: THEME_MAP[k], color: rgb(hex) })) } }, fields: "colorScheme" } });
    }
  }

  if (fix && reqs.length) await api.batchUpdate(presentationId, reqs);
  const fixedCount = issues.filter((i) => i.fixed).length;
  const summary = issues.length ? `${issues.length} problemów, naprawiono ${fixedCount}${issues.some((i) => i.kind === "off-template") ? "; slajdy poza szablonem wymagają odtworzenia" : ""}.` : "Prezentacja jest spójna z marką C2C.";
  return { presentationId, slidesChecked: pres.slides?.length ?? 0, issues, fixedCount, summary };
}
