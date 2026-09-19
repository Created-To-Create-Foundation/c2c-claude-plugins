/**
 * Buduje szablon C2C jako .pptx z katalogu layoutów (LAYOUTS).
 * Każdy layout = defineSlideMaster w pptxgenjs = slideLayout w pliku.
 * Po zapisie podmienia schemat kolorów i czcionki motywu (theme1.xml), tak by
 * po konwersji do Google Slides master miał kolory i fonty C2C.
 */
import { PptxGenCtor, type PptxGen } from "../pptx/pptxgen.js";
import JSZip from "jszip";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LAYOUTS, FOOTER, type LayoutDef, type Placeholder, type Decor } from "../brand/layouts.js";
import { tokens, hex6, assetPath, iconPath, type IconVariant } from "../brand/tokens.js";
import { pluginRoot } from "../paths.js";

export const TEMPLATE_REL_PATH = "template/c2c-template.pptx";

function color(key: string): string {
  const t = tokens();
  const v = t.colors[key];
  if (!v) throw new Error(`Brak koloru "${key}" w tokens.json`);
  return hex6(v);
}

function resolveAsset(asset: string): string {
  if (asset.startsWith("icon:")) {
    const [, name, variant] = asset.split(":");
    return iconPath(name, (variant as IconVariant) ?? "gold");
  }
  if (asset.startsWith("logos.")) {
    const rel = tokens().logos[asset.slice(6)];
    if (typeof rel !== "string") throw new Error(`Brak logo ${asset}`);
    return assetPath(rel);
  }
  return assetPath(asset);
}

function placeholderObject(ph: Placeholder): Record<string, unknown> {
  const t = tokens();
  const s = ph.style;
  const options: Record<string, unknown> = {
    name: ph.key,
    type: ph.kind === "title" ? "title" : ph.kind === "pic" ? "pic" : "body",
    x: ph.x, y: ph.y, w: ph.w, h: ph.h,
    margin: 0,
  };
  if (s) {
    Object.assign(options, {
      fontFace: s.font === "heading" ? t.fonts.heading : t.fonts.body,
      fontSize: s.sizePt,
      color: color(s.color),
      bold: !!s.bold,
      italic: !!s.italic,
      align: s.align ?? "left",
      valign: s.valign ?? "top",
      bullet: s.bullets ? { indent: 14 } : false,
      lineSpacingMultiple: s.lineSpacing ?? 1.2,
      paraSpaceAfter: s.paraSpaceAfterPt ?? 0,
    });
    if (s.caps) options.charSpacing = 2;
  }
  return { placeholder: { options, text: ph.kind === "pic" ? undefined : ph.prompt } };
}

function decorObject(d: Decor): Record<string, unknown> {
  switch (d.kind) {
    case "rect":
      return {
        rect: {
          x: d.x, y: d.y, w: d.w, h: d.h,
          fill: { color: color(d.fill), transparency: d.transparency ?? 0 },
          line: d.lineColor ? { color: color(d.lineColor), width: d.lineWidthPt ?? 1, transparency: d.lineTransparency ?? 0 } : { color: color(d.fill), width: 0, transparency: 100 },
        },
      };
    case "line":
      return { line: { x: d.x, y: d.y, w: d.w, h: d.h, line: { color: color(d.color), width: d.widthPt ?? 1, transparency: d.transparency ?? 0 } } };
    case "image":
      return { image: { path: resolveAsset(d.asset), x: d.x, y: d.y, w: d.w, h: d.h } };
  }
}

export function defineLayout(pptx: PptxGen, l: LayoutDef): void {
  const t = tokens();
  const objects: Record<string, unknown>[] = [];
  for (const d of l.decor) objects.push(decorObject(d));
  // Placeholdery po dekoracjach: z-order = kolejność w tablicy
  for (const ph of l.placeholders) objects.push(placeholderObject(ph));
  if (l.footer) {
    const logo = l.surface === "dark" ? t.logos.horizontalWarmWhite : t.logos.horizontalNavy;
    objects.push({ image: { path: assetPath(logo as string), x: FOOTER.logo.x, y: FOOTER.logo.y, h: FOOTER.logo.h, w: FOOTER.logo.h * FOOTER.logo.aspect } });
  }
  const master: Record<string, unknown> = { title: l.name, objects };
  if (l.background === "dark") master.background = { path: assetPath(t.backgrounds.dark) };
  else if (l.background === "light") master.background = { path: assetPath(t.backgrounds.light) };
  else master.background = { color: color("navy") };
  if (l.footer) {
    master.slideNumber = {
      x: FOOTER.slideNumber.x, y: FOOTER.slideNumber.y, w: FOOTER.slideNumber.w, h: FOOTER.slideNumber.h,
      fontFace: t.fonts.body, fontSize: FOOTER.slideNumber.sizePt, align: "right",
      color: l.surface === "dark" ? color("cream") : color("mutedOnLight"),
    };
  }
  pptx.defineSlideMaster(master as never);
}

/** Schemat kolorów motywu -> Google Slides ThemeColorType (DARK1..FOLLOWED_HYPERLINK). */
export function themeColorScheme(): Record<string, string> {
  const t = tokens().colors;
  return {
    dk1: t.navy, lt1: t.warmWhite, dk2: t.navyDeep, lt2: t.cream,
    accent1: t.gold, accent2: t.navy, accent3: t.brownDark, accent4: t.blue, accent5: t.cream, accent6: t.brownMid,
    hlink: t.blue, folHlink: t.brownMid,
  };
}

async function patchTheme(pptxPath: string): Promise<void> {
  const t = tokens();
  const zip = await JSZip.loadAsync(readFileSync(pptxPath));
  const themeFile = Object.keys(zip.files).find((f) => /ppt\/theme\/theme\d+\.xml/.test(f));
  if (!themeFile) throw new Error("Brak theme1.xml w pptx");
  let xml = await zip.file(themeFile)!.async("string");
  for (const [k, v] of Object.entries(themeColorScheme())) {
    xml = xml.replace(new RegExp(`<a:${k}>[\\s\\S]*?</a:${k}>`), `<a:${k}><a:srgbClr val="${hex6(v)}"/></a:${k}>`);
  }
  xml = xml.replace(/<a:majorFont>\s*<a:latin typeface="[^"]*"/, `<a:majorFont><a:latin typeface="${t.fonts.heading}"`);
  xml = xml.replace(/<a:minorFont>\s*<a:latin typeface="[^"]*"/, `<a:minorFont><a:latin typeface="${t.fonts.body}"`);
  zip.file(themeFile, xml);
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  writeFileSync(pptxPath, out);
}

export async function buildTemplate(outPath = join(pluginRoot(), TEMPLATE_REL_PATH)): Promise<string> {
  const t = tokens();
  const pptx = new PptxGenCtor();
  pptx.layout = "LAYOUT_16x9";
  pptx.theme = { headFontFace: t.fonts.heading, bodyFontFace: t.fonts.body };
  pptx.title = "Szablon Created to Create";
  pptx.author = "Created to Create";
  for (const l of LAYOUTS) defineLayout(pptx, l);
  // Jeden slajd na layout: pokazuje layouty w Slides i pozwala je obejrzeć po konwersji.
  for (const l of LAYOUTS) pptx.addSlide({ masterName: l.name });
  mkdirSync(dirname(outPath), { recursive: true });
  await pptx.writeFile({ fileName: outPath });
  await patchTheme(outPath);
  return outPath;
}

const isMain = process.argv[1] && /build-template\.(ts|js)$/.test(process.argv[1]);
if (isMain) {
  buildTemplate().then((p) => console.log(`Szablon zapisany: ${p}`)).catch((e) => { console.error(e); process.exit(1); });
}
