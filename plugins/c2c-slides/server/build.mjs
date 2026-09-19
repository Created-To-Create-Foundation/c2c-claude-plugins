import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
mkdirSync("dist", { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  banner: {
    js: [
      "import { createRequire as __c2cCreateRequire } from 'node:module';",
      "import { fileURLToPath as __c2cFileURLToPath } from 'node:url';",
      "import { dirname as __c2cDirname } from 'node:path';",
      "const require = __c2cCreateRequire(import.meta.url);",
      "const __filename = __c2cFileURLToPath(import.meta.url);",
      "const __dirname = __c2cDirname(__filename);",
    ].join("\n"),
  },
  logLevel: "info",
};

await build({ ...common, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });
await build({ ...common, entryPoints: ["src/cli/render-pptx.ts"], outfile: "dist/render-pptx.js" });

copyFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm"), "dist/index_bg.wasm");
console.log("dist/index.js + dist/index_bg.wasm gotowe");
