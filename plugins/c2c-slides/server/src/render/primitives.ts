/**
 * Prymitywy natywne wspólne dla renderera Google Slides i .pptx.
 * Pozycje w calach na slajdzie 10 x 5.625 in; czcionki w pt; kolory #RRGGBB.
 */
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

export interface Paragraph { text: string; level?: number; bullet?: boolean; bold?: boolean }

export type Primitive =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill?: string; fillAlpha?: number; stroke?: string; strokeAlpha?: number; strokeWidthPt?: number; radiusIn?: number }
  | { kind: "ellipse"; x: number; y: number; w: number; h: number; fill?: string; fillAlpha?: number; stroke?: string; strokeWidthPt?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; alpha?: number; widthPt?: number; dash?: boolean }
  | { kind: "text"; x: number; y: number; w: number; h: number; paragraphs: Paragraph[]; font: "heading" | "body"; sizePt: number; color: string; bold?: boolean; italic?: boolean; align?: Align; valign?: VAlign; caps?: boolean; lineSpacing?: number }
  | { kind: "image"; x: number; y: number; w: number; h: number; png: Buffer; alt?: string; description?: string }
  | { kind: "table"; x: number; y: number; w: number; h: number; columns: string[]; rows: string[][]; surface: "dark" | "light"; highlightRow?: number; colWidths?: number[]; numericCols?: number[] };

export const PT_PER_IN = 72;
