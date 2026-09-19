/**
 * Renderer wykresów C2C: ZNAKI (słupki, linie, pierścienie) jako SVG -> PNG.
 * Etykiety osi, wartości i legenda są dodawane NATYWNIE w Slides/pptx (edytowalne,
 * w czcionkach marki), dlatego SVG nie zawiera tekstu i nie potrzebuje fontów.
 * Układ liczony jest w punktach (pt) w tym samym układzie współrzędnych, w którym
 * renderer slajdów rozmieszcza etykiety.
 */
import type { ChartSpec } from "../spec/deck-spec.js";
import { tokens } from "../brand/tokens.js";

export interface ChartLayout {
  widthPt: number;
  heightPt: number;
  /** obszar wykresu (bez marginesów na etykiety) w pt */
  plot: { x: number; y: number; w: number; h: number };
  /** etykiety kategorii: pozycja środka w pt */
  categoryLabels: { text: string; x: number; y: number; w: number }[];
  /** etykiety wartości (nad słupkiem / przy punkcie) */
  valueLabels: { text: string; x: number; y: number; w: number; align: "center" | "left" | "right"; color: string }[];
  /** etykiety osi wartości (linie siatki) */
  gridLabels: { text: string; x: number; y: number; w: number }[];
  legend: { name: string; color: string }[];
  /** dla donut: środek i etykieta całkowita */
  center?: { x: number; y: number; text: string };
  seriesColors: string[];
  svg: string;
}

export interface ChartArea { widthPt: number; heightPt: number; surface: "dark" | "light" }

const fmt = (v: number, suffix = ""): string => {
  const abs = Math.abs(v);
  const s = abs >= 1000 ? v.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) : v.toLocaleString("pl-PL", { maximumFractionDigits: abs < 10 ? 1 : 0 });
  return `${s}${suffix}`;
};

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export function seriesColors(spec: ChartSpec, surface: "dark" | "light"): string[] {
  const t = tokens().chart;
  const base = surface === "dark" ? t.categoricalDark : t.categoricalLight;
  const n = spec.series.length;
  if (spec.highlightSeries !== undefined) {
    const mutedBase = surface === "dark" ? "#FFF8F2" : "#222A3F";
    return spec.series.map((_, i) => (i === spec.highlightSeries ? t.highlight : hexAlpha(mutedBase, t.mutedSeriesAlpha)));
  }
  return spec.series.map((_, i) => base[i % base.length]);
}

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  const step = candidates.find((c) => c >= rough) ?? candidates[candidates.length - 1];
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function layoutChart(spec: ChartSpec, area: ChartArea): ChartLayout {
  const t = tokens().chart;
  const colors = seriesColors(spec, area.surface);
  const grid = area.surface === "dark" ? hexAlpha(t.gridlineDark, t.gridlineDarkAlpha) : hexAlpha(t.gridlineLight, t.gridlineLightAlpha);
  const labelColor = area.surface === "dark" ? "#FFF8F2" : "#222A3F";
  const W = area.widthPt;
  const H = area.heightPt;
  const legend = spec.series.length > 1 ? spec.series.map((s, i) => ({ name: s.name, color: colors[i] })) : [];
  const legendH = legend.length ? 22 : 0;
  const parts: string[] = [];
  const out: ChartLayout = { widthPt: W, heightPt: H, plot: { x: 0, y: 0, w: W, h: H }, categoryLabels: [], valueLabels: [], gridLabels: [], legend, seriesColors: colors, svg: "" };

  if (spec.type === "donut") {
    const values = spec.series[0].values;
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const size = Math.min(W - 220, H - legendH);
    const cx = size / 2 + 10;
    const cy = legendH + size / 2;
    const rOut = size / 2;
    const rIn = rOut * 0.62;
    let angle = -Math.PI / 2;
    const donutColors = spec.categories.map((_, i) => (area.surface === "dark" ? t.categoricalDark : t.categoricalLight)[i % 5]);
    values.forEach((v, i) => {
      const frac = v / total;
      const a2 = angle + frac * Math.PI * 2 - 0.02;
      const large = frac > 0.5 ? 1 : 0;
      const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
      parts.push(`<path d="M ${p(rOut, angle)} A ${rOut} ${rOut} 0 ${large} 1 ${p(rOut, a2)} L ${p(rIn, a2)} A ${rIn} ${rIn} 0 ${large} 0 ${p(rIn, angle)} Z" fill="${donutColors[i]}"/>`);
      angle = a2 + 0.02;
    });
    out.center = { x: cx, y: cy, text: fmt(total, spec.valueSuffix) };
    out.legend = spec.categories.map((c, i) => ({ name: `${c} · ${fmt(values[i], spec.valueSuffix)}`, color: donutColors[i] }));
    out.plot = { x: cx - rOut, y: cy - rOut, w: size, h: size };
    out.svg = wrap(W, H, parts);
    return out;
  }

  const catCount = spec.categories.length;
  const gridLabelW = 56;
  const catLabelH = 22;
  const valueLabelH = spec.showValues ? 16 : 0;
  const horizontal = spec.type === "bar";
  const plot = horizontal
    ? { x: 120, y: legendH + 4, w: W - 120 - 60, h: H - legendH - 4 - catLabelH }
    : { x: gridLabelW, y: legendH + valueLabelH, w: W - gridLabelW, h: H - legendH - valueLabelH - catLabelH };
  out.plot = plot;

  const stacked = spec.type === "stacked-column";
  const maxVal = stacked
    ? Math.max(...spec.categories.map((_, ci) => spec.series.reduce((a, s) => a + (s.values[ci] ?? 0), 0)))
    : Math.max(...spec.series.flatMap((s) => s.values), 0);
  const ticks = niceTicks(maxVal);
  const top = ticks[ticks.length - 1];
  const scale = (v: number) => (horizontal ? plot.w : plot.h) * (v / top);

  // Siatka
  for (const tv of ticks) {
    if (horizontal) {
      const x = plot.x + scale(tv);
      parts.push(`<line x1="${x}" y1="${plot.y}" x2="${x}" y2="${plot.y + plot.h}" stroke="${grid}" stroke-width="1"/>`);
      out.gridLabels.push({ text: fmt(tv, spec.valueSuffix), x: x - 25, y: plot.y + plot.h + 2, w: 50 });
    } else {
      const y = plot.y + plot.h - scale(tv);
      parts.push(`<line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.w}" y2="${y}" stroke="${grid}" stroke-width="1"/>`);
      out.gridLabels.push({ text: fmt(tv, spec.valueSuffix), x: 0, y: y - 8, w: gridLabelW - 8 });
    }
  }

  const r = t.barRadiusPt;
  if (spec.type === "column" || stacked) {
    const groupW = plot.w / catCount;
    const inner = groupW * 0.68;
    const nSeries = stacked ? 1 : spec.series.length;
    const barW = inner / nSeries;
    spec.categories.forEach((cat, ci) => {
      const gx = plot.x + ci * groupW + (groupW - inner) / 2;
      out.categoryLabels.push({ text: cat, x: plot.x + ci * groupW, y: plot.y + plot.h + 4, w: groupW });
      let stackY = plot.y + plot.h;
      spec.series.forEach((s, si) => {
        const v = s.values[ci] ?? 0;
        const h = scale(v);
        if (stacked) {
          const y = stackY - h;
          parts.push(`<rect x="${gx.toFixed(2)}" y="${y.toFixed(2)}" width="${inner.toFixed(2)}" height="${h.toFixed(2)}" fill="${colors[si]}"/>`);
          stackY = y;
          if (spec.showValues && h > 14) out.valueLabels.push({ text: fmt(v, spec.valueSuffix), x: gx, y: y + h / 2 - 8, w: inner, align: "center", color: si === 0 && area.surface === "light" ? "#FFF8F2" : labelColor });
        } else {
          const x = gx + si * barW;
          const y = plot.y + plot.h - h;
          parts.push(`<path d="${roundedTop(x, y, barW - 2, h, Math.min(r, barW / 2))}" fill="${colors[si]}"/>`);
          if (spec.showValues) out.valueLabels.push({ text: fmt(v, spec.valueSuffix), x: x - 10, y: y - valueLabelH, w: barW + 18, align: "center", color: labelColor });
        }
      });
      if (stacked && spec.showValues) {
        const total = spec.series.reduce((a, s) => a + (s.values[ci] ?? 0), 0);
        out.valueLabels.push({ text: fmt(total, spec.valueSuffix), x: gx - 10, y: stackY - valueLabelH, w: inner + 20, align: "center", color: labelColor });
      }
    });
  } else if (horizontal) {
    const groupH = plot.h / catCount;
    const inner = groupH * 0.62;
    const barH = inner / spec.series.length;
    spec.categories.forEach((cat, ci) => {
      const gy = plot.y + ci * groupH + (groupH - inner) / 2;
      out.categoryLabels.push({ text: cat, x: 0, y: gy + inner / 2 - 8, w: plot.x - 10 });
      spec.series.forEach((s, si) => {
        const v = s.values[ci] ?? 0;
        const w = scale(v);
        const y = gy + si * barH;
        parts.push(`<path d="${roundedRight(plot.x, y, w, barH - 2, Math.min(r, barH / 2))}" fill="${colors[si]}"/>`);
        if (spec.showValues) out.valueLabels.push({ text: fmt(v, spec.valueSuffix), x: plot.x + w + 4, y: y + (barH - 2) / 2 - 8, w: 56, align: "left", color: labelColor });
      });
    });
  } else if (spec.type === "line") {
    const stepX = plot.w / Math.max(1, catCount - 1);
    spec.categories.forEach((cat, ci) => {
      out.categoryLabels.push({ text: cat, x: plot.x + ci * stepX - stepX / 2, y: plot.y + plot.h + 4, w: stepX });
    });
    spec.series.forEach((s, si) => {
      const pts = s.values.map((v, ci) => [plot.x + ci * stepX, plot.y + plot.h - scale(v)] as const);
      parts.push(`<polyline points="${pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}" fill="none" stroke="${colors[si]}" stroke-width="${t.lineWidthPt}" stroke-linejoin="round" stroke-linecap="round"/>`);
      pts.forEach((p, ci) => {
        parts.push(`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="3.5" fill="${colors[si]}"/>`);
        if (spec.showValues && (spec.series.length === 1 || si === spec.highlightSeries)) out.valueLabels.push({ text: fmt(s.values[ci], spec.valueSuffix), x: p[0] - 28, y: p[1] - 20, w: 56, align: "center", color: labelColor });
      });
    });
  }
  out.svg = wrap(W, H, parts);
  return out;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0.5) return `M ${x} ${y} h ${w} v 0 h ${-w} Z`;
  const rr = Math.min(r, h);
  return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`;
}
function roundedRight(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0.5) return `M ${x} ${y} v ${h} Z`;
  const rr = Math.min(r, w);
  return `M ${x} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} H ${x} Z`;
}
function wrap(w: number, h: number, parts: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join("")}</svg>`;
}
