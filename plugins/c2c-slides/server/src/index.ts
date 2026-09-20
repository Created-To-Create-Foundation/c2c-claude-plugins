#!/usr/bin/env node
/**
 * Serwer MCP "c2c-slides": prezentacje Google Slides w stylu Created to Create.
 * Model nie dostaje surowego API Slides; dostaje typowane slajdy (DeckSpec),
 * których wygląd wymusza szablon C2C.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { join } from "node:path";
import { DeckSpec, SlideSpec } from "./spec/deck-spec.js";
import { authStatus, login, logout } from "./google/oauth.js";
import { listAppFiles, MIME_SLIDES, GoogleApiError } from "./google/api.js";
import * as deck from "./slides/deck.js";
import { auditDeck } from "./slides/audit.js";
import { renderPptx } from "./pptx/renderer.js";
import { tokens } from "./brand/tokens.js";
import { LAYOUTS } from "./brand/layouts.js";
import { dataDir } from "./paths.js";

const VERSION = "0.1.1";

const server = new McpServer({ name: "c2c-slides", version: VERSION });

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };
const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const fail = (e: unknown): ToolResult => {
  const msg = e instanceof GoogleApiError ? `${e.message}${e.status === 401 ? " Zaloguj się ponownie: c2c_login." : e.status === 403 ? " Brak dostępu do pliku: pod scope drive.file narzędzie widzi tylko pliki, które utworzyło lub które wskazałeś w c2c_pick_presentation." : ""}` : e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text", text: `Błąd: ${msg}` }], isError: true };
};
const run = async (fn: () => Promise<unknown>): Promise<ToolResult> => { try { return ok(await fn()); } catch (e) { return fail(e); } };

/** Akceptuje ID albo pełny URL prezentacji. */
function presId(input: string): string {
  const m = input.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : input.trim();
}

const PresentationArg = z.string().describe("ID prezentacji lub pełny URL https://docs.google.com/presentation/d/...");

// ---------- Konto Google ----------

server.registerTool("c2c_auth_status", {
  title: "Status logowania Google",
  description: "Sprawdza, czy użytkownik jest połączony z Google (scope drive.file) i skąd pochodzi klient OAuth.",
  inputSchema: {},
}, async () => run(async () => authStatus()));

server.registerTool("c2c_login", {
  title: "Połącz z Google",
  description: "Otwiera przeglądarkę, by użytkownik zalogował się własnym kontem Google. Prosi WYŁĄCZNIE o scope drive.file (dostęp do plików utworzonych przez to narzędzie lub wskazanych przez użytkownika). Czeka na zakończenie logowania (do 5 minut).",
  inputSchema: {},
}, async () => run(async () => {
  let url = "";
  const r = await login({ onAuthUrl: (u) => { url = u; } });
  return { message: `Połączono z kontem ${r.account ?? "(nieznane)"}.`, account: r.account, authUrl: url };
}));

server.registerTool("c2c_logout", {
  title: "Odłącz Google",
  description: "Usuwa zapisane tokeny Google z tego komputera.",
  inputSchema: {},
}, async () => run(async () => { logout(); return "Wylogowano."; }));

server.registerTool("c2c_pick_presentation", {
  title: "Wskaż istniejącą prezentację",
  description: "Otwiera w przeglądarce logowanie Google z oknem wyboru plików (Google Picker). Użytkownik wskazuje istniejącą prezentację Google Slides, a narzędzie dostaje do niej dostęp (drive.file). Zwraca ID wskazanych plików. Użyj przed edycją/audytem prezentacji, której narzędzie nie utworzyło.",
  inputSchema: { multiple: z.boolean().optional().describe("Pozwól wybrać wiele plików") },
}, async ({ multiple }) => run(async () => {
  const r = await login({ picker: true, pickerMimeTypes: [MIME_SLIDES], pickerMultiple: !!multiple });
  return { account: r.account, pickedFileIds: r.pickedFileIds, urls: r.pickedFileIds.map((id) => `https://docs.google.com/presentation/d/${id}/edit`) };
}));

// ---------- Katalog i marka ----------

server.registerTool("c2c_catalog", {
  title: "Katalog typów slajdów i zasady marki",
  description: "Zwraca listę typów slajdów (DeckSpec), ich pola i limity oraz zasady kolorów/typografii C2C. Wywołaj przed pierwszym c2c_create_deck w sesji.",
  inputSchema: {},
}, async () => run(async () => {
  const t = tokens();
  const types = SlideSpec.options.map((o) => {
    const shape = (o as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
    const type = (shape.type as z.ZodLiteral<string>).value;
    const fields = Object.entries(shape).filter(([k]) => k !== "type").map(([k, v]) => `${k}${v.isOptional() ? "?" : ""}${v.description ? ` (${v.description})` : ""}`);
    return { type, fields };
  });
  return {
    slideTypes: types,
    layouts: LAYOUTS.map((l) => ({ id: l.id, name: l.name, surface: l.surface })),
    icons: t.icons.names,
    brandRules: t.rules,
    fonts: t.fonts,
    guidance: [
      "Prezentacja: okładka -> (sekcja -> 2-5 slajdów treści)* -> zamknięcie. Rytm jasne/ciemne ok. 60/40 (ciemne: cover, section, numbers, quote, closing).",
      "Maks. 7 punktów na slajdzie, każdy do ~12 słów. Tytuły 2-6 słów, zdaniowa wielkość liter, bez kropki na końcu (poza tezami).",
      "Eyebrow to krótki kontekst (nazwa wydarzenia, moduł, data). Renderer sam zamienia go na kapitaliki.",
      "Wykresy: maks. 5 serii; do wyróżnienia jednej serii użyj highlightSeries. Ikony diagramów tylko z listy icons.",
      "Zdjęcia: ścieżka lokalna lub publiczny URL PNG/JPG; renderer kadruje do proporcji placeholdera.",
      "Notatki prelegenta (notes) w tonie C2C: forma 'Wy', bez języka sprzedażowego.",
    ],
  };
}));

// ---------- Tworzenie i edycja ----------

server.registerTool("c2c_create_deck", {
  title: "Utwórz prezentację Google Slides",
  description: "Tworzy NOWĄ prezentację na Dysku Google użytkownika z szablonu C2C i wypełnia ją slajdami wg DeckSpec. Zwraca URL, ID prezentacji i ID slajdów. Po utworzeniu wywołaj c2c_thumbnails, aby sprawdzić wygląd.",
  inputSchema: { deck: DeckSpec },
}, async ({ deck: spec }) => run(async () => deck.createDeck(spec)));

server.registerTool("c2c_add_slides", {
  title: "Dodaj slajdy",
  description: "Dodaje slajdy (DeckSpec.slides) do istniejącej prezentacji z szablonu C2C, na końcu lub na wskazanej pozycji (insertAt, od 0).",
  inputSchema: { presentationId: PresentationArg, slides: z.array(SlideSpec).min(1).max(30), insertAt: z.number().int().min(0).optional() },
}, async ({ presentationId, slides, insertAt }) => run(async () => deck.addSlides(presId(presentationId), slides, insertAt)));

server.registerTool("c2c_get_deck", {
  title: "Konspekt prezentacji",
  description: "Zwraca strukturę prezentacji: slajdy, ich layouty/typy C2C, teksty placeholderów, inne teksty, liczbę obrazów/tabel, specyfikacje wykresów i notatki. Działa też dla prezentacji spoza szablonu (isC2C=false), by przenieść treść do nowej prezentacji C2C.",
  inputSchema: { presentationId: PresentationArg },
}, async ({ presentationId }) => run(async () => deck.getOutline(presId(presentationId))));

server.registerTool("c2c_update_slide", {
  title: "Zmień teksty slajdu",
  description: "Podmienia teksty w placeholderach wskazanego slajdu (klucze jak w c2c_get_deck, np. title, body, eyebrow, card1Title). Tablica stringów = kolejne akapity/punkty. Style pozostają z szablonu.",
  inputSchema: { presentationId: PresentationArg, slideObjectId: z.string(), texts: z.record(z.string(), z.union([z.string(), z.array(z.string())])), notes: z.string().optional() },
}, async ({ presentationId, slideObjectId, texts, notes }) => run(async () => deck.updateSlideTexts(presId(presentationId), slideObjectId, texts, notes)));

server.registerTool("c2c_delete_slides", {
  title: "Usuń slajdy",
  description: "Usuwa slajdy o podanych ID.",
  inputSchema: { presentationId: PresentationArg, slideObjectIds: z.array(z.string()).min(1) },
}, async ({ presentationId, slideObjectIds }) => run(async () => { await deck.deleteSlides(presId(presentationId), slideObjectIds); return `Usunięto ${slideObjectIds.length} slajdów.`; }));

server.registerTool("c2c_move_slides", {
  title: "Przenieś slajdy",
  description: "Przenosi slajdy na pozycję insertionIndex (od 0, liczoną przed usunięciem ich z obecnych pozycji).",
  inputSchema: { presentationId: PresentationArg, slideObjectIds: z.array(z.string()).min(1), insertionIndex: z.number().int().min(0) },
}, async ({ presentationId, slideObjectIds, insertionIndex }) => run(async () => { await deck.moveSlides(presId(presentationId), slideObjectIds, insertionIndex); return "Przeniesiono."; }));

// ---------- Kontrola jakości ----------

server.registerTool("c2c_thumbnails", {
  title: "Miniatury slajdów",
  description: "Renderuje miniatury PNG slajdów do plików lokalnych i zwraca ich ścieżki. Obejrzyj je (Read), aby sprawdzić przepełnienia tekstu i układ przed oddaniem prezentacji użytkownikowi.",
  inputSchema: { presentationId: PresentationArg, slideObjectIds: z.array(z.string()).optional(), size: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional() },
}, async ({ presentationId, slideObjectIds, size }) => run(async () => deck.thumbnails(presId(presentationId), slideObjectIds, size ?? "MEDIUM")));

server.registerTool("c2c_audit_deck", {
  title: "Audyt spójności marki",
  description: "Sprawdza prezentację pod kątem odstępstw od marki C2C (slajdy poza szablonem, nadpisane czcionki/kolory, obce fonty, schemat kolorów motywu). Z fix=true naprawia to, co da się naprawić automatycznie.",
  inputSchema: { presentationId: PresentationArg, fix: z.boolean().optional() },
}, async ({ presentationId, fix }) => run(async () => auditDeck(presId(presentationId), !!fix)));

server.registerTool("c2c_export", {
  title: "Eksport PDF/PPTX",
  description: "Eksportuje prezentację do PDF lub PPTX i zapisuje lokalnie. Zwraca ścieżkę pliku.",
  inputSchema: { presentationId: PresentationArg, format: z.enum(["pdf", "pptx"]), outPath: z.string().optional() },
}, async ({ presentationId, format, outPath }) => run(async () => deck.exportDeck(presId(presentationId), format, outPath)));

server.registerTool("c2c_list_decks", {
  title: "Moje prezentacje C2C",
  description: "Lista prezentacji utworzonych przez to narzędzie (drive.file nie widzi innych plików użytkownika).",
  inputSchema: {},
}, async () => run(async () => listAppFiles(MIME_SLIDES)));

// ---------- Fallback bez Google ----------

server.registerTool("c2c_render_pptx", {
  title: "Zapisz prezentację jako .pptx (bez Google)",
  description: "Renderuje DeckSpec do pliku PowerPoint z tym samym szablonem C2C. Ścieżka awaryjna, gdy logowanie do Google jest niemożliwe: użytkownik wgrywa plik na Dysk i otwiera w Google Slides.",
  inputSchema: { deck: DeckSpec, outPath: z.string().optional().describe("Ścieżka docelowa .pptx; domyślnie w katalogu danych pluginu") },
}, async ({ deck: spec, outPath }) => run(async () => {
  const safe = spec.title.replace(/[^\w\dąćęłńóśźżĄĆĘŁŃÓŚŹŻ .-]+/g, "_");
  return renderPptx(spec, outPath ?? join(dataDir(), "exports", `${safe}.pptx`));
}));

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
