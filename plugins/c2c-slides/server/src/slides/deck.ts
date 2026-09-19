/**
 * Operacje na prezentacji Google Slides zbudowanej z szablonu C2C.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pluginRoot, dataDir } from "../paths.js";
import { TEMPLATE_REL_PATH } from "../template/build-template.js";
import * as api from "../google/api.js";
import { compose, type ComposedSlide } from "../render/compose.js";
import type { DeckSpec, SlideSpec } from "../spec/deck-spec.js";
import { LAYOUTS } from "../brand/layouts.js";
import { TempHost } from "./hosting.js";
import { genId, primitiveRequests, textIntoShape, elementProps } from "./requests.js";
import { mapLayouts, requireLayout, layoutMapForSlide, slidePlaceholders, textOf, elementBox, type LayoutMap } from "./layout-map.js";

const PRES_FIELDS = "presentationId,title,slides(objectId,slideProperties(layoutObjectId,masterObjectId,notesPage(notesProperties)),pageElements),layouts(objectId,layoutProperties,pageElements),masters(objectId,pageProperties)";

export interface DeckRef { presentationId: string; url: string; title: string }

async function loadPresentation(presentationId: string): Promise<api.Presentation> {
  return api.getPresentation(presentationId, PRES_FIELDS);
}

/** Nowa prezentacja z szablonu (.pptx z repo -> konwersja do Slides). */
async function newPresentationFromTemplate(title: string): Promise<api.DriveFile> {
  const buf = readFileSync(join(pluginRoot(), TEMPLATE_REL_PATH));
  return api.uploadFile(buf, title, api.MIME_PPTX, api.MIME_SLIDES);
}

interface BuiltSlide { slideId: string; requests: unknown[]; notes?: string }

/** Żądania tworzące jeden slajd z layoutu i wypełniające go. */
async function buildSlideRequests(composed: ComposedSlide, map: LayoutMap, insertionIndex: number, host: TempHost): Promise<BuiltSlide> {
  const slideId = genId("slide");
  const reqs: unknown[] = [];
  const idByKey: Record<string, string> = {};
  const mappings = Object.values(map.placeholders).map((mp) => {
    const objectId = genId(`ph_${mp.key}`.slice(0, 20));
    idByKey[mp.key] = objectId;
    return { layoutPlaceholder: { type: mp.type, index: mp.index }, objectId };
  });
  reqs.push({ createSlide: { objectId: slideId, insertionIndex, slideLayoutReference: { layoutId: map.layoutObjectId }, placeholderIdMappings: mappings } });

  for (const ph of composed.layout.placeholders) {
    const objectId = idByKey[ph.key];
    if (!objectId) continue; // placeholder nieodnaleziony w layoucie po konwersji
    const mp = map.placeholders[ph.key];
    if (ph.kind === "pic") {
      const png = composed.images[ph.key];
      reqs.push({ deleteObject: { objectId } });
      if (png) {
        const url = await host.host(png, ph.key);
        const imgId = genId("img");
        reqs.push({ createImage: { objectId: imgId, url, elementProperties: elementProps(slideId, mp.box.x, mp.box.y, mp.box.w, mp.box.h) } });
      }
      continue;
    }
    const paragraphs = composed.texts[ph.key];
    if (paragraphs && paragraphs.length) reqs.push(...textIntoShape(objectId, paragraphs, { bullets: !!ph.style?.bullets && paragraphs.some((p) => p.bullet), sizePt: ph.style?.sizePt }));
    else reqs.push({ deleteObject: { objectId } });
  }
  const cleaned = reqs;
  for (const prim of composed.primitives) {
    const url = prim.kind === "image" ? await host.host(prim.png, prim.alt?.replace(/[^\w-]+/g, "_").slice(0, 24) || "obraz") : undefined;
    cleaned.push(...primitiveRequests(slideId, prim, url));
  }
  return { slideId, requests: cleaned, notes: composed.notes };
}

async function runBatches(presentationId: string, requests: unknown[], chunk = 300): Promise<void> {
  for (let i = 0; i < requests.length; i += chunk) {
    await api.batchUpdate(presentationId, requests.slice(i, i + chunk));
  }
}

async function writeNotes(presentationId: string, notes: { slideId: string; notes?: string }[]): Promise<void> {
  const withNotes = notes.filter((n) => n.notes);
  if (!withNotes.length) return;
  const pres = await api.getPresentation(presentationId, "slides(objectId,slideProperties.notesPage.notesProperties.speakerNotesObjectId)");
  const reqs: unknown[] = [];
  for (const n of withNotes) {
    const slide = pres.slides?.find((s) => s.objectId === n.slideId);
    const notesId = slide?.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
    if (notesId) reqs.push({ deleteText: { objectId: notesId, textRange: { type: "ALL" } } }, { insertText: { objectId: notesId, insertionIndex: 0, text: n.notes! } });
  }
  // deleteText na pustym kształcie zwraca błąd -> wstaw tylko
  await runBatches(presentationId, reqs.filter((r) => !(r as Record<string, unknown>).deleteText)).catch(async () => runBatches(presentationId, reqs.filter((r) => !(r as Record<string, unknown>).deleteText)));
}

export async function createDeck(spec: DeckSpec): Promise<DeckRef & { slideIds: string[] }> {
  const file = await newPresentationFromTemplate(spec.title);
  const presentationId = file.id;
  const pres = await loadPresentation(presentationId);
  const maps = mapLayouts(pres);
  if (!maps.length) throw new Error("Po konwersji szablonu nie znaleziono layoutów C2C. Zgłoś problem (szablon/konwersja).");
  const host = new TempHost();
  try {
    const built: BuiltSlide[] = [];
    for (let i = 0; i < spec.slides.length; i++) {
      const composed = await compose(spec.slides[i], i + 1);
      built.push(await buildSlideRequests(composed, requireLayout(maps, composed.layout.id), i, host));
    }
    const requests = built.flatMap((b) => b.requests);
    // usuń slajdy przykładowe z szablonu (po utworzeniu nowych, by prezentacja nigdy nie była pusta)
    for (const s of pres.slides ?? []) requests.push({ deleteObject: { objectId: s.objectId } });
    await runBatches(presentationId, requests);
    await writeNotes(presentationId, built);
    return { presentationId, url: api.presentationUrl(presentationId), title: spec.title, slideIds: built.map((b) => b.slideId) };
  } catch (e) {
    // nie zostawiaj na Dysku na wpół zbudowanej prezentacji
    await api.deleteFile(presentationId).catch(() => undefined);
    throw e;
  } finally {
    await host.cleanup();
  }
}

export async function addSlides(presentationId: string, slides: SlideSpec[], insertAt?: number): Promise<{ slideIds: string[] }> {
  const pres = await loadPresentation(presentationId);
  const maps = mapLayouts(pres);
  if (!maps.length) throw new Error("Ta prezentacja nie pochodzi z szablonu C2C (brak layoutów C2C). Użyj c2c_rebrand_deck, aby przenieść treść do nowej prezentacji.");
  const count = pres.slides?.length ?? 0;
  const start = insertAt === undefined ? count : Math.min(Math.max(0, insertAt), count);
  const host = new TempHost();
  try {
    const built: BuiltSlide[] = [];
    for (let i = 0; i < slides.length; i++) {
      const composed = await compose(slides[i], start + i + 1);
      built.push(await buildSlideRequests(composed, requireLayout(maps, composed.layout.id), start + i, host));
    }
    await runBatches(presentationId, built.flatMap((b) => b.requests));
    await writeNotes(presentationId, built);
    return { slideIds: built.map((b) => b.slideId) };
  } finally {
    await host.cleanup();
  }
}

export interface SlideOutline {
  index: number;
  objectId: string;
  layout: string | null;
  type: string | null;
  texts: Record<string, string>;
  otherTexts: string[];
  images: number;
  tables: number;
  charts: { objectId: string; spec: unknown }[];
  notes: string;
}

export async function getOutline(presentationId: string): Promise<DeckRef & { isC2C: boolean; slides: SlideOutline[] }> {
  const pres = await api.getPresentation(presentationId, `${PRES_FIELDS},slides.slideProperties.notesPage.pageElements`);
  const maps = mapLayouts(pres);
  const slides: SlideOutline[] = (pres.slides ?? []).map((s, i) => {
    const map = layoutMapForSlide(maps, s);
    const layoutPage = pres.layouts?.find((l) => l.objectId === s.slideProperties?.layoutObjectId);
    const texts: Record<string, string> = {};
    const used = new Set<string>();
    if (map) for (const [key, el] of Object.entries(slidePlaceholders(s, map))) { texts[key] = textOf(el); used.add(el.objectId); }
    const otherTexts: string[] = [];
    let images = 0, tables = 0;
    const charts: { objectId: string; spec: unknown }[] = [];
    for (const el of s.pageElements ?? []) {
      if (used.has(el.objectId)) continue;
      if (el.shape?.text) { const tx = textOf(el); if (tx.trim()) otherTexts.push(tx); }
      if (el.image) {
        images++;
        if (el.description?.includes("c2cChart")) { try { charts.push({ objectId: el.objectId, spec: JSON.parse(el.description).c2cChart }); } catch { /* ignore */ } }
      }
      if (el.table) tables++;
    }
    const notesEls = s.slideProperties?.notesPage?.pageElements ?? [];
    const notes = notesEls.filter((e) => e.shape?.placeholder?.type === "BODY").map((e) => textOf(e)).join("\n").trim();
    return { index: i, objectId: s.objectId, layout: layoutPage?.layoutProperties?.displayName ?? null, type: map?.layout.id ?? null, texts, otherTexts, images, tables, charts, notes };
  });
  return { presentationId, url: api.presentationUrl(presentationId), title: pres.title ?? "", isC2C: maps.length > 0, slides };
}

/** Podmienia teksty placeholderów wskazanego slajdu (klucze jak w layoucie). */
export async function updateSlideTexts(presentationId: string, slideObjectId: string, texts: Record<string, string | string[]>, notes?: string): Promise<{ updated: string[]; ignored: string[] }> {
  const pres = await loadPresentation(presentationId);
  const maps = mapLayouts(pres);
  const slide = pres.slides?.find((s) => s.objectId === slideObjectId);
  if (!slide) throw new Error(`Nie znaleziono slajdu ${slideObjectId}.`);
  const map = layoutMapForSlide(maps, slide);
  if (!map) throw new Error("Ten slajd nie używa layoutu C2C. Możesz go usunąć i dodać nowy (c2c_add_slides).");
  const els = slidePlaceholders(slide, map);
  const reqs: unknown[] = [];
  const updated: string[] = [], ignored: string[] = [];
  for (const [key, value] of Object.entries(texts)) {
    const el = els[key];
    const ph = map.layout.placeholders.find((p) => p.key === key);
    if (!el || !ph || ph.kind === "pic") { ignored.push(key); continue; }
    const paragraphs = (Array.isArray(value) ? value : [value]).map((t) => ({ text: ph.style?.caps ? t.toUpperCase() : t, bullet: !!ph.style?.bullets, level: 0 }));
    const hasText = textOf(el).length > 0;
    reqs.push(...textIntoShape(el.objectId, paragraphs, { clear: hasText, bullets: !!ph.style?.bullets }));
    updated.push(key);
  }
  await runBatches(presentationId, reqs);
  if (notes !== undefined) await writeNotes(presentationId, [{ slideId: slideObjectId, notes }]);
  return { updated, ignored };
}

export async function deleteSlides(presentationId: string, slideObjectIds: string[]): Promise<void> {
  await runBatches(presentationId, slideObjectIds.map((id) => ({ deleteObject: { objectId: id } })));
}

export async function moveSlides(presentationId: string, slideObjectIds: string[], insertionIndex: number): Promise<void> {
  await api.batchUpdate(presentationId, [{ updateSlidesPosition: { slideObjectIds, insertionIndex } }]);
}

export async function thumbnails(presentationId: string, slideObjectIds?: string[], size: "SMALL" | "MEDIUM" | "LARGE" = "MEDIUM"): Promise<{ objectId: string; index: number; path: string }[]> {
  const pres = await api.getPresentation(presentationId, "slides(objectId)");
  const all = (pres.slides ?? []).map((s, i) => ({ objectId: s.objectId, index: i }));
  const wanted = slideObjectIds?.length ? all.filter((s) => slideObjectIds.includes(s.objectId)) : all;
  const dir = join(dataDir(), "thumbnails", presentationId);
  mkdirSync(dir, { recursive: true });
  const out: { objectId: string; index: number; path: string }[] = [];
  for (const s of wanted) {
    const url = await api.getThumbnailUrl(presentationId, s.objectId, size);
    const png = await api.downloadPublic(url);
    const path = join(dir, `${String(s.index + 1).padStart(2, "0")}-${s.objectId}.png`);
    writeFileSync(path, png);
    out.push({ ...s, path });
  }
  return out;
}

export async function exportDeck(presentationId: string, format: "pptx" | "pdf", outPath?: string): Promise<string> {
  const mime = format === "pdf" ? "application/pdf" : api.MIME_PPTX;
  const buf = await api.exportFile(presentationId, mime);
  const meta = await api.getFile(presentationId, "name");
  const path = outPath ?? join(dataDir(), "exports", `${meta.name.replace(/[^\w\dąćęłńóśźżĄĆĘŁŃÓŚŹŻ .-]+/g, "_")}.${format}`);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, buf);
  return path;
}

export const layoutCatalog = () => LAYOUTS.map((l) => ({ id: l.id, name: l.name, surface: l.surface, placeholders: l.placeholders.map((p) => p.key) }));
export { elementBox };
