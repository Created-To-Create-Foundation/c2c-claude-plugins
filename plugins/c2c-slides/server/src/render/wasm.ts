/** Jednorazowa inicjalizacja resvg-wasm współdzielona przez wykresy i kadrowanie obrazów. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initWasm } from "@resvg/resvg-wasm";

let ready: Promise<void> | undefined;

function wasmPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "index_bg.wasm");
  try { readFileSync(bundled); return bundled; } catch { /* dev: node_modules */ }
  return createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
}

export function ensureWasm(): Promise<void> {
  if (!ready) {
    ready = initWasm(readFileSync(wasmPath())).catch((e: unknown) => {
      if (e instanceof Error && /already initialized/i.test(e.message)) return;
      throw e;
    });
  }
  return ready;
}
