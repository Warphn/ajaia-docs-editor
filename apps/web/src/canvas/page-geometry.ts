export interface Point {
  x: number;
  y: number;
}

/** Excalidraw's view state: scene coordinate → screen = (scene + scroll) × zoom. */
export interface CanvasViewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

/** Where the page sits on a fresh canvas, and where "Reset position" puts it back. */
export const PAGE_ORIGIN: Point = { x: 0, y: 0 };
export const PAGE_WIDTH = 816;
/** Space kept above the page so the canvas toolbar never covers it after a reset. */
const RESET_TOP_MARGIN = 88;

/** Screen placement of the page inside the workspace, using the same math Excalidraw uses for elements. */
export function pageScreenTransform(pagePosition: Point, viewport: CanvasViewport) {
  return {
    left: (pagePosition.x + viewport.scrollX) * viewport.zoom,
    top: (pagePosition.y + viewport.scrollY) * viewport.zoom,
    scale: viewport.zoom,
  };
}

/** Converts a pointer movement on screen into a page movement on the canvas (zoom-aware). */
export function movePage(pagePosition: Point, screenDelta: Point, zoom: number): Point {
  return {
    x: pagePosition.x + screenDelta.x / zoom,
    y: pagePosition.y + screenDelta.y / zoom,
  };
}

/** Viewport (zoom 1) that shows the page horizontally centered near the top of the workspace. */
export function viewportCenteredOnPage(pagePosition: Point, workspaceWidth: number): CanvasViewport {
  return {
    scrollX: workspaceWidth / 2 - (pagePosition.x + PAGE_WIDTH / 2),
    scrollY: RESET_TOP_MARGIN - pagePosition.y,
    zoom: 1,
  };
}

/** Moves the dotted background together with the canvas so the page and drawings feel anchored to it. */
export function gridBackgroundStyle(viewport: CanvasViewport, gridSize = 20) {
  const scaledGrid = gridSize * viewport.zoom;
  return {
    backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
    backgroundPosition: `${viewport.scrollX * viewport.zoom}px ${viewport.scrollY * viewport.zoom}px`,
  };
}
