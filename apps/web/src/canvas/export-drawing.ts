import { exportToSvg } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { collectElementsForExport } from './scene-helpers';

/** Space around the drawing inside the exported image. */
const EXPORT_PADDING = 16;

/**
 * Exports the current canvas selection as an SVG data URI, ready to embed in the document.
 * Fonts are inlined so text renders identically inside <img> and in printed PDFs.
 */
export async function exportSelectionAsImage(excalidrawAPI: ExcalidrawImperativeAPI): Promise<string | null> {
  const appState = excalidrawAPI.getAppState();
  const elements = collectElementsForExport(excalidrawAPI.getSceneElements(), appState.selectedElementIds);
  if (elements.length === 0) {
    return null;
  }

  const svg = await exportToSvg({
    elements,
    appState: { ...appState, exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false },
    files: excalidrawAPI.getFiles(),
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
