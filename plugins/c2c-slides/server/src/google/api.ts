/**
 * Minimalny klient REST Google Drive v3 + Slides v1 (fetch, bez SDK).
 * Retry z backoffem na 429/5xx. Wszystko działa pod samym scope drive.file.
 */
import { getAccessToken } from "./oauth.js";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const SLIDES = "https://slides.googleapis.com/v1";

export const MIME_SLIDES = "application/vnd.google-apps.presentation";
export const MIME_FOLDER = "application/vnd.google-apps.folder";
export const MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export class GoogleApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) { super(message); }
}

async function call<T>(url: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(url, { ...init, headers });
  if (r.status === 429 || r.status >= 500) {
    if (attempt < 5) {
      await new Promise((res) => setTimeout(res, 500 * 2 ** attempt + Math.random() * 250));
      return call<T>(url, init, attempt + 1);
    }
  }
  if (!r.ok) {
    const text = await r.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* text */ }
    const msg = typeof body === "object" && body && "error" in body ? JSON.stringify((body as { error: unknown }).error) : text;
    throw new GoogleApiError(r.status, body, `Google API ${r.status}: ${msg.slice(0, 600)}`);
  }
  if (r.status === 204) return undefined as T;
  const ct = r.headers.get("content-type") ?? "";
  return (ct.includes("application/json") ? await r.json() : await r.arrayBuffer()) as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ---------- Drive ----------

export interface DriveFile { id: string; name: string; mimeType: string; webViewLink?: string; modifiedTime?: string; parents?: string[] }

/** Upload z konwersją do Google Slides (lub inny plik). Multipart. */
export async function uploadFile(buffer: Buffer | Uint8Array, name: string, sourceMime: string, targetMime?: string, parents?: string[]): Promise<DriveFile> {
  const meta: Record<string, unknown> = { name };
  if (targetMime) meta.mimeType = targetMime;
  if (parents?.length) meta.parents = parents;
  const boundary = `c2c${Date.now().toString(36)}`;
  const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${sourceMime}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, Buffer.from(buffer), tail]);
  return call<DriveFile>(`${UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,parents`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}`, "Content-Length": String(body.length) },
    body,
  });
}

export async function getFile(fileId: string, fields = "id,name,mimeType,webViewLink,modifiedTime,parents"): Promise<DriveFile> {
  return call<DriveFile>(`${DRIVE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`);
}

export async function copyFile(fileId: string, name: string): Promise<DriveFile> {
  return call<DriveFile>(`${DRIVE}/files/${encodeURIComponent(fileId)}/copy?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`, json({ name }));
}

export async function renameFile(fileId: string, name: string): Promise<DriveFile> {
  return call<DriveFile>(`${DRIVE}/files/${encodeURIComponent(fileId)}?fields=id,name,webViewLink`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
}

export async function deleteFile(fileId: string): Promise<void> {
  await call<void>(`${DRIVE}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

/** Pliki utworzone przez aplikację (drive.file widzi tylko je). */
export async function listAppFiles(mimeType = MIME_SLIDES, pageSize = 25): Promise<DriveFile[]> {
  const q = encodeURIComponent(`mimeType='${mimeType}' and trashed=false`);
  const r = await call<{ files: DriveFile[] }>(`${DRIVE}/files?q=${q}&orderBy=modifiedTime desc&pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,modifiedTime)`);
  return r.files ?? [];
}

export async function ensureFolder(name: string): Promise<string> {
  const q = encodeURIComponent(`mimeType='${MIME_FOLDER}' and name='${name.replace(/'/g, "\\'")}' and trashed=false`);
  const r = await call<{ files: DriveFile[] }>(`${DRIVE}/files?q=${q}&fields=files(id)`);
  if (r.files?.[0]) return r.files[0].id;
  const created = await call<DriveFile>(`${DRIVE}/files?fields=id`, json({ name, mimeType: MIME_FOLDER }));
  return created.id;
}

/** Udostępnia plik "każdy z linkiem może czytać" (potrzebne, by Slides mógł pobrać obraz). */
export async function shareAnyoneReader(fileId: string): Promise<void> {
  await call(`${DRIVE}/files/${encodeURIComponent(fileId)}/permissions?fields=id`, json({ role: "reader", type: "anyone" }));
}

export async function exportFile(fileId: string, mimeType: string): Promise<Buffer> {
  const ab = await call<ArrayBuffer>(`${DRIVE}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(mimeType)}`);
  return Buffer.from(ab);
}

// ---------- Slides ----------

export type Presentation = {
  presentationId: string;
  title?: string;
  pageSize?: { width: Dim; height: Dim };
  slides?: Page[];
  masters?: Page[];
  layouts?: Page[];
  revisionId?: string;
};
export type Dim = { magnitude: number; unit: "EMU" | "PT" };
export type Page = {
  objectId: string;
  pageType?: string;
  pageElements?: PageElement[];
  slideProperties?: { layoutObjectId?: string; masterObjectId?: string; notesPage?: Page };
  layoutProperties?: { masterObjectId?: string; name?: string; displayName?: string };
  pageProperties?: { colorScheme?: { colors: { type: string; color: { red?: number; green?: number; blue?: number } }[] } };
  notesProperties?: { speakerNotesObjectId?: string };
};
export type PageElement = {
  objectId: string;
  size?: { width: Dim; height: Dim };
  transform?: { scaleX?: number; scaleY?: number; shearX?: number; shearY?: number; translateX?: number; translateY?: number; unit: string };
  title?: string;
  description?: string;
  shape?: { shapeType?: string; placeholder?: { type: string; index?: number; parentObjectId?: string }; text?: TextContent; shapeProperties?: unknown };
  image?: { contentUrl?: string; sourceUrl?: string; imageProperties?: unknown; placeholder?: { type: string; index?: number } };
  table?: { rows: number; columns: number; tableRows?: unknown[] };
  elementGroup?: { children: PageElement[] };
  line?: unknown;
  sheetsChart?: unknown;
};
export type TextContent = {
  textElements?: { startIndex?: number; endIndex?: number; textRun?: { content: string; style?: Record<string, unknown> }; paragraphMarker?: { style?: unknown; bullet?: unknown } }[];
};

export async function getPresentation(presentationId: string, fields?: string): Promise<Presentation> {
  const f = fields ? `?fields=${encodeURIComponent(fields)}` : "";
  return call<Presentation>(`${SLIDES}/presentations/${encodeURIComponent(presentationId)}${f}`);
}

export async function batchUpdate(presentationId: string, requests: unknown[]): Promise<{ replies?: unknown[] }> {
  if (!requests.length) return { replies: [] };
  return call(`${SLIDES}/presentations/${encodeURIComponent(presentationId)}:batchUpdate`, json({ requests }));
}

export async function getThumbnailUrl(presentationId: string, pageObjectId: string, size: "SMALL" | "MEDIUM" | "LARGE" = "MEDIUM"): Promise<string> {
  const r = await call<{ contentUrl: string }>(`${SLIDES}/presentations/${encodeURIComponent(presentationId)}/pages/${encodeURIComponent(pageObjectId)}/thumbnail?thumbnailProperties.thumbnailSize=${size}&thumbnailProperties.mimeType=PNG`);
  return r.contentUrl;
}

export async function downloadPublic(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Pobranie ${url} nie powiodło się: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export const presentationUrl = (id: string): string => `https://docs.google.com/presentation/d/${id}/edit`;
