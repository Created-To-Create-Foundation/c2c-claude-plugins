/**
 * Slides API przyjmuje obrazy tylko z publicznego URL. Hostujemy PNG tymczasowo na Dysku
 * użytkownika (plik utworzony przez aplikację = dozwolony pod drive.file), udostępniamy
 * "każdy z linkiem", a po wstawieniu (Slides kopiuje bajty) usuwamy cały folder tymczasowy.
 */
import { deleteFile, ensureFolder, shareAnyoneReader, uploadFile } from "../google/api.js";

export class TempHost {
  private folderId?: string;
  private count = 0;

  async host(png: Buffer, name = "obraz"): Promise<string> {
    if (!this.folderId) {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      this.folderId = await ensureFolder(`C2C Slides · tymczasowe ${stamp}`);
    }
    const f = await uploadFile(png, `${String(++this.count).padStart(2, "0")}-${name}.png`, "image/png", undefined, [this.folderId]);
    await shareAnyoneReader(f.id);
    return `https://drive.google.com/uc?export=download&id=${f.id}`;
  }

  async cleanup(): Promise<void> {
    if (!this.folderId) return;
    const id = this.folderId;
    this.folderId = undefined;
    await deleteFile(id).catch(() => undefined);
  }
}
