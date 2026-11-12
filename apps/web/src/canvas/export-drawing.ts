import { exportToSvg } from '@excalidraw/excalidraw';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';

/** Space around the drawing inside the exported image. */
const EXPORT_PADDING = 16;

/**
 * Exports canvas elements as an SVG data URI, ready to embed in the document.
 * Fonts are inlined so text renders identically inside <img> and in printed PDFs.
 */
export async function exportElementsAsImage(
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): Promise<string> {
  const svg = await exportToSvg({
    elements,
    appState: { ...appState, exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false },
    files,
    exportPadding: EXPORT_PADDING,
  });
  return svgToDataUrl(new XMLSerializer().serializeToString(svg));
}

export function svgToDataUrl(svgMarkup: string): string {
  const bytes = new TextEncoder().encode(svgMarkup);
  let binary = '';
  // Chunked to avoid "too many arguments" on large drawings.
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
