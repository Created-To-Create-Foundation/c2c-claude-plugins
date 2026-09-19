import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { DeckSpec } from "../src/spec/deck-spec.js";
import { compose } from "../src/render/compose.js";
import { renderPptx } from "../src/pptx/renderer.js";
import { primitiveRequests, textIntoShape } from "../src/slides/requests.js";
import { buildTemplate } from "../src/template/build-template.js";
import { pluginRoot } from "../src/paths.js";

const example = DeckSpec.parse(JSON.parse(readFileSync(join(pluginRoot(), "examples", "przyklad-weekend.json"), "utf8")));

describe("kompozycja i renderowanie", () => {
  it("kompozytor wypełnia tylko klucze istniejące w layoucie", async () => {
    for (let i = 0; i < example.slides.length; i++) {
      const c = await compose(example.slides[i], i + 1);
      const keys = new Set(c.layout.placeholders.map((p) => p.key));
      for (const k of Object.keys(c.texts)) expect(keys.has(k), `${c.layout.id}: ${k}`).toBe(true);
      for (const k of Object.keys(c.images)) expect(keys.has(k), `${c.layout.id}: ${k}`).toBe(true);
    }
  });
  it("wykres daje obraz + natywne etykiety, tabela daje prymityw table", async () => {
    const chart = await compose(example.slides.find((s) => s.type === "chart")!, 1);
    expect(chart.primitives.some((p) => p.kind === "image")).toBe(true);
    expect(chart.primitives.filter((p) => p.kind === "text").length).toBeGreaterThan(2);
    const agenda = await compose(example.slides.find((s) => s.type === "agenda")!, 1);
    expect(agenda.primitives[0].kind).toBe("table");
  });
  it("prymitywy zamieniają się na poprawne żądania Slides", async () => {
    const agenda = await compose(example.slides.find((s) => s.type === "agenda")!, 1);
    const reqs = primitiveRequests("slide1", agenda.primitives[0]);
    expect(reqs[0]).toHaveProperty("createTable");
    const text = textIntoShape("obj", [{ text: "a", bullet: true }, { text: "b", bullet: true, level: 1 }]);
    expect(JSON.stringify(text)).toContain("\\tb");
    expect(text.some((r) => (r as Record<string, unknown>).createParagraphBullets)).toBe(true);
  });
  it("renderuje przykładową prezentację do .pptx z właściwą liczbą slajdów i notatkami", async () => {
    const dir = mkdtempSync(join(tmpdir(), "c2c-"));
    const out = await renderPptx(example, join(dir, "test.pptx"));
    const zip = await JSZip.loadAsync(readFileSync(out));
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(example.slides.length);
    const notes = Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f));
    expect(notes.length).toBeGreaterThan(0);
    const layoutNames = await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f)).map(async (f) => (await zip.file(f)!.async("string")).match(/<p:cSld name="([^"]*)"/)?.[1]));
    expect(layoutNames.filter((n) => n?.startsWith("C2C"))).toHaveLength(18);
  });
  it("szablon buduje się z motywem C2C", async () => {
    const dir = mkdtempSync(join(tmpdir(), "c2c-tpl-"));
    const p = await buildTemplate(join(dir, "tpl.pptx"));
    const zip = await JSZip.loadAsync(readFileSync(p));
    const theme = await zip.file("ppt/theme/theme1.xml")!.async("string");
    expect(theme).toContain('<a:dk1><a:srgbClr val="222A3F"/></a:dk1>');
    expect(theme).toContain('typeface="Golos Text"');
  });
});
