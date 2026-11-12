import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CanvasScene } from '../api/types';
import { CanvasControls } from './CanvasControls';
import { exportSelectionAsImage } from './export-drawing';
import { IncludeDrawingChip } from './IncludeDrawingChip';
import {
  gridBackgroundStyle,
  movePage,
  PAGE_ORIGIN,
  PAGE_WIDTH,
  pageScreenTransform,
  viewportCenteredOnPage,
  type CanvasViewport,
  type Point,
} from './page-geometry';
import { sceneFingerprint, type SceneElement } from './scene-helpers';
import { useCanvasAutosave } from './use-canvas-autosave';
import { usePageLock } from './use-page-lock';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

export interface CanvasWorkspaceProps {
  documentId: string;
  canEdit: boolean;
  initialScene: CanvasScene | null;
  /** The document sheet (editor), rendered on the canvas at the page position. */
  page: ReactNode;
  /** Inserts an exported drawing at the editor cursor. */
  onIncludeDrawing: (imageSource: string) => void;
  /** Lets the editor export the selection when the "include" chip is dropped on the page. */
  exportSelectionRef: React.RefObject<(() => Promise<string | null>) | null>;
  onPrint: () => void;
}

/**
 * Infinite whiteboard (Excalidraw) with the document page floating on it.
 * The page is a regular DOM element positioned with the canvas' scroll and zoom, so the rich-text
 * editor keeps working normally while drawings live around it.
 */
export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const { documentId, canEdit, initialScene, page, onIncludeDrawing, exportSelectionRef, onPrint } = props;
  const workspaceRef = useRef<HTMLDivElement>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const pagePositionRef = useRef<Point>(initialScene?.pagePosition ?? PAGE_ORIGIN);
  const [pagePosition, setPagePosition] = useState<Point>(pagePositionRef.current);
  const [viewport, setViewport] = useState<CanvasViewport>({ scrollX: 0, scrollY: 0, zoom: 1 });
  const [selectionSize, setSelectionSize] = useState(0);
  const { isLocked, toggleLock } = usePageLock(documentId);

  const canvasAutosave = useCanvasAutosave(
    documentId,
    sceneFingerprint(
      (initialScene?.elements ?? []) as unknown as SceneElement[],
      Object.keys(initialScene?.files ?? {}),
      pagePositionRef.current,
    ),
  );

  const applyViewport = useCallback((nextViewport: CanvasViewport) => {
    setViewport(nextViewport);
    excalidrawAPIRef.current?.updateScene({
      appState: {
        scrollX: nextViewport.scrollX,
        scrollY: nextViewport.scrollY,
        zoom: { value: nextViewport.zoom as never },
      },
    });
  }, []);

  const centerOnPage = useCallback(
    (position: Point) => applyViewport(viewportCenteredOnPage(position, workspaceRef.current?.clientWidth ?? 1200)),
    [applyViewport],
  );

  /** Saves drawings + page position together, so a reload restores the exact layout. */
  const queueCurrentScene = useCallback(() => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (!canEdit || !excalidrawAPI) {
      return;
    }
    const elements = excalidrawAPI.getSceneElements();
    const referencedFileIds = new Set(
      elements.map((element) => (element as { fileId?: string | null }).fileId).filter(Boolean),
    );
    const files = Object.fromEntries(
      Object.entries(excalidrawAPI.getFiles()).filter(([fileId]) => referencedFileIds.has(fileId)),
    );
    const scene: CanvasScene = {
      elements: elements as unknown as Record<string, unknown>[],
      files: files as unknown as CanvasScene['files'],
      pagePosition: pagePositionRef.current,
    };
    canvasAutosave.queueScene(scene, sceneFingerprint(elements, Object.keys(files), pagePositionRef.current));
  }, [canEdit, canvasAutosave]);

  const updatePagePosition = useCallback((position: Point) => {
    pagePositionRef.current = position;
    setPagePosition(position);
  }, []);

  const exportSelection = useCallback(async () => {
    const excalidrawAPI = excalidrawAPIRef.current;
    return excalidrawAPI ? exportSelectionAsImage(excalidrawAPI) : null;
  }, []);

  useLayoutEffect(() => {
    exportSelectionRef.current = exportSelection;
    return () => {
      exportSelectionRef.current = null;
    };
  }, [exportSelection, exportSelectionRef]);

  // Wheel over the page navigates the canvas, exactly like wheel over the drawings.
  const pageLayerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  useEffect(() => {
    const pageLayer = pageLayerRef.current;
    const workspace = workspaceRef.current;
    if (!pageLayer || !workspace) {
      return;
    }
    function navigateCanvas(event: WheelEvent) {
      event.preventDefault();
      const current = viewportRef.current;
      if (event.ctrlKey || event.metaKey) {
        const workspaceBounds = workspace!.getBoundingClientRect();
        const pointerX = event.clientX - workspaceBounds.left;
        const pointerY = event.clientY - workspaceBounds.top;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * (1 - event.deltaY * 0.002)));
        // Keep the point under the pointer fixed while zooming.
        applyViewport({
          zoom: nextZoom,
          scrollX: pointerX / nextZoom - (pointerX / current.zoom - current.scrollX),
          scrollY: pointerY / nextZoom - (pointerY / current.zoom - current.scrollY),
        });
        return;
      }
      const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX;
      const verticalDelta = event.shiftKey ? 0 : event.deltaY;
      applyViewport({
        ...current,
        scrollX: current.scrollX - horizontalDelta / current.zoom,
        scrollY: current.scrollY - verticalDelta / current.zoom,
      });
    }
    pageLayer.addEventListener('wheel', navigateCanvas, { passive: false });
    return () => pageLayer.removeEventListener('wheel', navigateCanvas);
  }, [applyViewport]);

  function startPageDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (isLocked || !canEdit) {
      return;
    }
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const dragStart = { x: event.clientX, y: event.clientY };
    const positionAtStart = pagePositionRef.current;

    function onPointerMove(moveEvent: PointerEvent) {
      updatePagePosition(
        movePage(positionAtStart, { x: moveEvent.clientX - dragStart.x, y: moveEvent.clientY - dragStart.y }, viewportRef.current.zoom),
      );
    }
    function onPointerUp() {
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      queueCurrentScene();
    }
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
  }

  /** Editors move the page back to its original spot; viewers just recenter on the saved layout. */
  function resetPagePosition() {
    if (!canEdit) {
      centerOnPage(pagePositionRef.current);
      return;
    }
    updatePagePosition(PAGE_ORIGIN);
    centerOnPage(PAGE_ORIGIN);
    queueCurrentScene();
  }

  const pagePlacement = pageScreenTransform(pagePosition, viewport);

  return (
    <div
      ref={workspaceRef}
      className="canvas-grid canvas-workspace relative isolate flex-1 overflow-hidden"
      style={gridBackgroundStyle(viewport)}
    >
      <Excalidraw
        excalidrawAPI={(excalidrawAPI) => {
          excalidrawAPIRef.current = excalidrawAPI;
          // Start with the page centered, whatever position it was saved at.
          requestAnimationFrame(() => centerOnPage(pagePositionRef.current));
        }}
        initialData={{
          elements: (initialScene?.elements ?? []) as never,
          files: (initialScene?.files ?? {}) as never,
          appState: { viewBackgroundColor: 'transparent', currentItemFontFamily: 1 },
        }}
        viewModeEnabled={!canEdit}
        onScrollChange={(scrollX, scrollY, zoom) => setViewport({ scrollX, scrollY, zoom: zoom.value })}
        onChange={(_elements, appState) => {
          const selectedCount = Object.values(appState.selectedElementIds).filter(Boolean).length;
          setSelectionSize((previousCount) => (previousCount === selectedCount ? previousCount : selectedCount));
          queueCurrentScene();
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: canEdit,
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />

      {/* z-index 3: above Excalidraw's canvases (1–2), below its toolbars and menus (4+). */}
      <div ref={pageLayerRef} className="pointer-events-none absolute inset-0 z-3">
        <div
          className="canvas-page pointer-events-auto absolute left-0 top-0"
          style={{
            width: PAGE_WIDTH,
            transform: `translate(${pagePlacement.left}px, ${pagePlacement.top}px) scale(${pagePlacement.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {canEdit && (
            <button
              type="button"
              onPointerDown={startPageDrag}
              disabled={isLocked}
              title={isLocked ? 'Page position is locked' : 'Drag to move the page on the canvas'}
              className={
                'print-hidden mb-1 flex w-full items-center justify-center rounded-t-md py-1 text-xs text-ink-faint ' +
                (isLocked ? 'cursor-not-allowed' : 'cursor-grab hover:bg-sheet/70 hover:text-ink-muted active:cursor-grabbing')
              }
            >
              {isLocked ? 'Page locked' : '⠿ Drag to move page'}
            </button>
          )}
          {page}
        </div>
      </div>

      <CanvasControls
        isLocked={isLocked}
        canEdit={canEdit}
        canvasSaveStatus={canvasAutosave.status}
        onToggleLock={toggleLock}
        onResetPosition={resetPagePosition}
        onPrint={onPrint}
      />
      {canEdit && selectionSize > 0 && (
        <IncludeDrawingChip
          onInclude={() => {
            void exportSelection().then((imageSource) => imageSource && onIncludeDrawing(imageSource));
          }}
        />
      )}
    </div>
  );
}
