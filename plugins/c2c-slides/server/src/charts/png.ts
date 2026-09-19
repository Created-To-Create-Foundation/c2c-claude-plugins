import { Resvg } from "@resvg/resvg-wasm";
import { ensureWasm } from "../render/wasm.js";

/** SVG (w pt) -> PNG o zadanej skali (domyślnie 3x dla ostrości na projektorze). */
export async function svgToPng(svg: string, scale = 3): Promise<Buffer> {
  await ensureWasm();
  const r = new Resvg(svg, { fitTo: { mode: "zoom", value: scale }, background: "rgba(0,0,0,0)" });
  return Buffer.from(r.render().asPng());
}
