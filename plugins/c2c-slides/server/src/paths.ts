import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Root of the plugin (folder containing brand/, template/, server/). */
export function pluginRoot(): string {
  const env = process.env.C2C_PLUGIN_ROOT;
  if (env && !env.includes("${") && existsSync(env)) return env;
  // dist/index.js -> server/dist -> server -> plugin root; src/paths.ts -> server/src -> server -> plugin root;
  // w paczce skillu .zip: render-pptx.js leży obok brand/ i template/
  const here = dirname(fileURLToPath(import.meta.url));
  for (const cand of [here, resolve(here, ".."), resolve(here, "..", ".."), resolve(here, "..", "..", "..")]) {
    if (existsSync(join(cand, "brand", "tokens.json"))) return cand;
  }
  return resolve(here, "..", "..");
}

/** Per-user writable data dir (tokens, cache). */
export function dataDir(): string {
  const env = process.env.C2C_DATA_DIR;
  const dir = env && !env.includes("${") ? env : join(homedir(), ".c2c-slides");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
