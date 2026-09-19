import { z } from "zod";

/**
 * DeckSpec: jedyny sposób, w jaki model opisuje prezentację.
 * Każdy typ slajdu mapuje się 1:1 na layout szablonu C2C; renderer nigdy nie
 * pozwala na dowolne style, więc spójność jest wymuszona mechanicznie.
 */

export const ImageRef = z.object({
  path: z.string().optional().describe("Ścieżka lokalna do PNG/JPG"),
  url: z.string().url().optional().describe("Publiczny URL PNG/JPG"),
  alt: z.string().optional(),
}).refine((v) => v.path || v.url, { message: "Podaj path lub url obrazu" });
export type ImageRef = z.infer<typeof ImageRef>;

const notes = z.string().optional().describe("Notatki prelegenta (tone of voice C2C)");
const eyebrowField = z.string().max(60).optional().describe("Krótka etykieta nad tytułem, np. 'Weekend C2C 2026'");

export const BulletItem = z.union([
  z.string(),
  z.object({ text: z.string(), sub: z.array(z.string()).max(4).optional() }),
]);
export type BulletItem = z.infer<typeof BulletItem>;

export const ChartSpec = z.object({
  type: z.enum(["column", "bar", "line", "donut", "stacked-column"]),
  categories: z.array(z.string()).min(1).max(12),
  series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })).min(1).max(5),
  valueSuffix: z.string().optional().describe("np. '%' lub ' zł'"),
  highlightSeries: z.number().int().min(0).optional().describe("Indeks serii wyróżnionej złotem; pozostałe wyciszone"),
  showValues: z.boolean().default(true),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const DiagramSpec = z.discriminatedUnion("type", [
  z.object({ type: z.literal("process"), steps: z.array(z.object({ title: z.string(), body: z.string().optional() })).min(2).max(5) }),
  z.object({ type: z.literal("timeline"), steps: z.array(z.object({ label: z.string(), title: z.string(), body: z.string().optional() })).min(2).max(6) }),
  z.object({ type: z.literal("pillars"), pillars: z.array(z.object({ title: z.string(), body: z.string().optional(), icon: z.string().optional() })).min(2).max(4) }),
  z.object({
    type: z.literal("matrix"),
    xAxis: z.tuple([z.string(), z.string()]),
    yAxis: z.tuple([z.string(), z.string()]),
    quadrants: z.tuple([z.string(), z.string(), z.string(), z.string()]).describe("Kolejność: lewy górny, prawy górny, lewy dolny, prawy dolny"),
  }),
]);
export type DiagramSpec = z.infer<typeof DiagramSpec>;

export const SlideSpec = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cover"), title: z.string().max(90), subtitle: z.string().max(160).optional(), meta: z.string().max(120).optional(), notes }),
  z.object({ type: z.literal("section"), number: z.string().max(3).optional(), title: z.string().max(80), subtitle: z.string().max(140).optional(), notes }),
  z.object({ type: z.literal("statement"), eyebrow: eyebrowField, title: z.string().max(140), lead: z.string().max(260).optional(), notes }),
  z.object({ type: z.literal("bullets"), eyebrow: eyebrowField, title: z.string().max(90), bullets: z.array(BulletItem).min(1).max(7), notes }),
  z.object({
    type: z.literal("two-column"), eyebrow: eyebrowField, title: z.string().max(90),
    left: z.object({ heading: z.string().max(60).optional(), bullets: z.array(BulletItem).max(6) }),
    right: z.object({ heading: z.string().max(60).optional(), bullets: z.array(BulletItem).max(6) }),
    notes,
  }),
  z.object({ type: z.literal("text-image"), eyebrow: eyebrowField, title: z.string().max(90), bullets: z.array(BulletItem).min(1).max(6), image: ImageRef, notes }),
  z.object({
    type: z.literal("cards"), eyebrow: eyebrowField, title: z.string().max(90),
    cards: z.array(z.object({ title: z.string().max(60), body: z.string().max(260) })).min(3).max(4),
    notes,
  }),
  z.object({
    type: z.literal("numbers"), eyebrow: eyebrowField, title: z.string().max(90),
    items: z.array(z.object({ value: z.string().max(12), label: z.string().max(120) })).min(1).max(3),
    notes,
  }),
  z.object({
    type: z.literal("agenda"), eyebrow: eyebrowField, title: z.string().max(90),
    items: z.array(z.object({ time: z.string().max(20).optional(), label: z.string().max(80), detail: z.string().max(120).optional() })).min(2).max(9),
    notes,
  }),
  z.object({
    type: z.literal("table"), eyebrow: eyebrowField, title: z.string().max(90),
    columns: z.array(z.string()).min(2).max(6),
    rows: z.array(z.array(z.string())).min(1).max(9),
    highlightRow: z.number().int().min(0).optional(),
    notes,
  }),
  z.object({ type: z.literal("quote"), quote: z.string().max(280), attribution: z.string().max(80).optional(), surface: z.enum(["dark", "light"]).default("dark"), notes }),
  z.object({ type: z.literal("chart"), eyebrow: eyebrowField, title: z.string().max(90), chart: ChartSpec, source: z.string().max(120).optional(), notes }),
  z.object({ type: z.literal("diagram"), eyebrow: eyebrowField, title: z.string().max(90), diagram: DiagramSpec, surface: z.enum(["dark", "light"]).default("light"), notes }),
  z.object({ type: z.literal("photo"), image: ImageRef, title: z.string().max(90).optional(), caption: z.string().max(120).optional(), notes }),
  z.object({
    type: z.literal("people"), eyebrow: eyebrowField, title: z.string().max(90),
    people: z.array(z.object({ name: z.string().max(60), role: z.string().max(80), image: ImageRef.optional() })).min(1).max(3),
    notes,
  }),
  z.object({ type: z.literal("closing"), title: z.string().max(90).default("Co możemy wspólnie stworzyć?"), subtitle: z.string().max(140).optional(), contacts: z.array(z.string().max(80)).max(4).optional(), notes }),
]);
export type SlideSpec = z.infer<typeof SlideSpec>;
export type SlideType = SlideSpec["type"];

export const DeckSpec = z.object({
  title: z.string().min(1).max(120).describe("Nazwa pliku prezentacji na Dysku"),
  slides: z.array(SlideSpec).min(1).max(60),
});
export type DeckSpec = z.infer<typeof DeckSpec>;

/** Typ slajdu -> id layoutu szablonu. */
export function layoutIdFor(slide: SlideSpec): string {
  switch (slide.type) {
    case "cards": return `cards-${slide.cards.length}`;
    case "quote": return slide.surface === "light" ? "quote-light" : "quote-dark";
    case "agenda": return "table";
    case "diagram": return slide.surface === "dark" ? "diagram-dark" : "diagram";
    default: return slide.type;
  }
}

export function bulletText(item: BulletItem): { text: string; sub: string[] } {
  return typeof item === "string" ? { text: item, sub: [] } : { text: item.text, sub: item.sub ?? [] };
}
