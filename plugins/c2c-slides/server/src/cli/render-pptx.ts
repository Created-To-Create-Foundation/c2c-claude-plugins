#!/usr/bin/env node
/**
 * CLI ścieżki awaryjnej: node render-pptx.js <deck.json> [out.pptx]
 * Waliduje DeckSpec i renderuje plik .pptx z szablonem C2C (bez Google).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DeckSpec } from "../spec/deck-spec.js";
import { renderPptx } from "../pptx/renderer.js";

async function main(): Promise<void> {
  const [, , input, output] = process.argv;
  if (!input) {
    console.error("Użycie: node render-pptx.js <deck.json> [wyjscie.pptx]");
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(input, "utf8"));
  const parsed = DeckSpec.safeParse(raw);
  if (!parsed.success) {
    console.error("DeckSpec niepoprawny:\n" + JSON.stringify(parsed.error.issues, null, 2));
    process.exit(1);
  }
  const safe = parsed.data.title.replace(/[^\w\dąćęłńóśźżĄĆĘŁŃÓŚŹŻ .-]+/g, "_");
  const out = resolve(output ?? `${safe}.pptx`);
  await renderPptx(parsed.data, out);
  console.log(out);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
