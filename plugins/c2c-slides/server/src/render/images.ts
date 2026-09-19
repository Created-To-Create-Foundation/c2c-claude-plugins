/**
 * Ładowanie obrazów (ścieżka/URL) i kadrowanie "cover" do zadanego aspektu.
 * Kadrowanie przez resvg-wasm (SVG <image preserveAspectRatio="slice">), bez natywnych zależności.
 */
import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-wasm";
import { ensureWasm } from "./wasm.js";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ImageRef } from "../spec/deck-spec.js";
import { pluginRoot } from "../paths.js";

export interface LoadedImage { buffer: Buffer; mime: "image/png" | "image/jpeg"; width: number; height: number }

export function imageSize(buf: Buffer): { width: number; height: number; mime: "image/png" | "image/jpeg" } {
  if (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), mime: "image/png" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7), mime: "image/jpeg" };
      }
      off += 2 + len;
    }
  }
  throw new Error("Nieobsługiwany format obrazu: użyj PNG lub JPEG.");
}

export async function loadImage(ref: ImageRef): Promise<LoadedImage> {
  let buffer: Buffer;
  if (ref.path) {
    // ścieżka względna: najpierw katalog roboczy, potem katalog pluginu (zasoby brand/)
    const p = isAbsolute(ref.path) || existsSync(ref.path) ? ref.path : join(pluginRoot(), ref.path);
    if (!existsSync(p)) throw new Error(`Nie znaleziono obrazu: ${ref.path}`);
    buffer = readFileSync(p);
  }
  else if (ref.url) {
    const r = await fetch(ref.url);
    if (!r.ok) throw new Error(`Nie udało się pobrać obrazu ${ref.url}: ${r.status}`);
    buffer = Buffer.from(await r.arrayBuffer());
  } else throw new Error("Obraz wymaga path lub url.");
  const s = imageSize(buffer);
  return { buffer, ...s };
}

/** Kadruje obraz do aspektu w/h (cover) i renderuje PNG o szerokości targetWidthPx. */
export async function coverCrop(img: LoadedImage, aspect: number, targetWidthPx = 1600): Promise<Buffer> {
  const current = img.width / img.height;
  if (Math.abs(current - aspect) < 0.01 && img.mime === "image/png") return img.buffer;
  await ensureWasm();
  const w = Math.min(targetWidthPx, Math.max(img.width, 320));
  const h = Math.round(w / aspect);
  const href = `data:${img.mime};base64,${img.buffer.toString("base64")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xlink:href="${href}"/></svg>`;
  const r = new Resvg(svg, { fitTo: { mode: "width", value: w } });
  return Buffer.from(r.render().asPng());
}
