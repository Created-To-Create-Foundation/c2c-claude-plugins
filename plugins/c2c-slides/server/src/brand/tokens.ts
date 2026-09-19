import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pluginRoot } from "../paths.js";

export interface BrandTokens {
  colors: Record<string, string>;
  rules: string[];
  gradients: Record<string, { angle: number; stops: string[] }>;
  fonts: { heading: string; body: string; fallbackHeading: string; fallbackBody: string };
  typeScalePt: Record<string, number>;
  slide: { widthIn: number; heightIn: number; marginIn: number; footerYIn: number };
  chart: {
    categoricalLight: string[];
    categoricalDark: string[];
    sequentialLight: string[];
    gridlineLight: string;
    gridlineLightAlpha: number;
    gridlineDark: string;
    gridlineDarkAlpha: number;
    highlight: string;
    mutedSeriesAlpha: number;
    maxSeries: number;
    lineWidthPt: number;
    barRadiusPt: number;
  };
  logos: Record<string, string | number>;
  backgrounds: { dark: string; light: string };
  icons: { dir: string; variants: string[]; names: string[] };
}

let cached: BrandTokens | undefined;

export function tokens(): BrandTokens {
  if (!cached) {
    cached = JSON.parse(readFileSync(join(pluginRoot(), "brand", "tokens.json"), "utf8")) as BrandTokens;
  }
  return cached;
}

/** Absolute path of a brand asset given its tokens.json relative path. */
export function assetPath(rel: string): string {
  return join(pluginRoot(), rel);
}

export type IconVariant = "gold" | "warm-white" | "navy";

export function iconPath(name: string, variant: IconVariant = "gold"): string {
  const t = tokens();
  if (!t.icons.names.includes(name)) {
    throw new Error(`Nieznana ikona "${name}". Dostępne: ${t.icons.names.join(", ")}`);
  }
  return join(pluginRoot(), t.icons.dir, variant, `icon-${name}-${variant}-512px.png`);
}

/** "#RRGGBB" -> pptxgenjs "RRGGBB" */
export const hex6 = (hex: string): string => hex.replace("#", "").slice(0, 6).toUpperCase();

/** "#RRGGBB" -> Slides API RgbColor (0..1) */
export function rgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace("#", "").slice(0, 6);
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export const IN_TO_PT = 72;
export const IN_TO_EMU = 914400;
export const PT_TO_EMU = 12700;

/** Miesza kolor fg z tłem bg przy kryciu alpha; zwraca "#RRGGBB" (dla miejsc, gdzie API nie wspiera alfa). */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = fg.replace("#", "").slice(0, 6), b = bg.replace("#", "").slice(0, 6);
  const ch = (i: number) => Math.round(alpha * parseInt(f.slice(i, i + 2), 16) + (1 - alpha) * parseInt(b.slice(i, i + 2), 16)).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(2)}${ch(4)}`.toUpperCase();
}
