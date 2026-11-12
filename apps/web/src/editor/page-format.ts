/**
 * A4 with 25 mm margins, used identically by the on-screen sheet and the print stylesheet, so lines
 * wrap at the same place and page breaks fall where the editor's guides show them.
 */
export const PAGE_FORMAT_MM = { width: 210, height: 297, margin: 25 } as const;

const PIXELS_PER_MILLIMETER = 96 / 25.4;

export const PAGE_WIDTH_PX = PAGE_FORMAT_MM.width * PIXELS_PER_MILLIMETER;
export const PAGE_CONTENT_HEIGHT_MM = PAGE_FORMAT_MM.height - 2 * PAGE_FORMAT_MM.margin;
export const PAGE_CONTENT_HEIGHT_PX = PAGE_CONTENT_HEIGHT_MM * PIXELS_PER_MILLIMETER;

/** Number of A4 pages needed for content of the given height (always at least one). */
export function countPages(contentHeightPx: number): number {
  // Half-pixel tolerance: sub-pixel rounding must not create an empty trailing page.
  return Math.max(1, Math.ceil((contentHeightPx - 0.5) / PAGE_CONTENT_HEIGHT_PX));
}
