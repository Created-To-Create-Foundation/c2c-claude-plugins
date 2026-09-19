#!/usr/bin/env node
/**
 * Pakuje skill c2c-slides-pptx jako samodzielny .zip do wgrania w claude.ai (Ustawienia → Możliwości → Skille)
 * lub w Cowork. Zawiera: SKILL.md, render-pptx.js, index_bg.wasm, brand/, template/, przykład DeckSpec.
 * Użycie: node scripts/build-skill-zip.mjs  -> dist-skill/c2c-slides-pptx.zip
 */
import JSZip from "jszip";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zip = new JSZip();
const folder = zip.folder("c2c-slides-pptx");

function addDir(dir, prefix) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) addDir(p, `${prefix}/${f}`);
    else folder.file(`${prefix}/${f}`, readFileSync(p));
  }
}

folder.file("SKILL.md", readFileSync(join(root, "skills/c2c-slides-pptx/SKILL.md")));
folder.file("render-pptx.js", readFileSync(join(root, "server/dist/render-pptx.js")));
folder.file("index_bg.wasm", readFileSync(join(root, "server/dist/index_bg.wasm")));
addDir(join(root, "brand"), "brand");
addDir(join(root, "template"), "template");
addDir(join(root, "examples"), "examples");
// głos marki jako materiał referencyjny w tej samej paczce
folder.file("references/brand-voice.md", readFileSync(join(root, "skills/c2c-brand-voice/SKILL.md")));

mkdirSync(join(root, "dist-skill"), { recursive: true });
const out = join(root, "dist-skill", "c2c-slides-pptx.zip");
writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(relative(process.cwd(), out), `${(statSync(out).size / 1024 / 1024).toFixed(1)} MB`);
