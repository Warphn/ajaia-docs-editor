import {
  CaptureUpdateAction,
  Excalidraw,
  newElementWith,
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CanvasScene } from '../api/types';
import { CanvasControls } from './CanvasControls';
import { exportElementsAsImage } from './export-drawing';
import { IncludeDrawingChip } from './IncludeDrawingChip';
import { nameWindowForLibraryReturns } from './library-return';
import { createLibraryStorageAdapter } from './library-storage';
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
import {
  collectElementsForExport,
  INCLUDED_DRAWING_KEY,
  restoreDraggedElements,
  sceneFingerprint,
  sharedDrawingId,
  type SceneElement,
} from './scene-helpers';
import { useCanvasAutosave } from './use-canvas-autosave';
import { usePageLock } from './use-page-lock';
import { useTheme } from '../theme/theme';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const libraryStorageAdapter = createLibraryStorageAdapter();

/** Where an included drawing should land: the editor cursor, or a point on screen (drag and drop). */
export type DropPoint = { clientX: number; clientY: number };

export interface CanvasWorkspaceProps {
  documentId: string;
  canEdit: boolean;
  initialScene: CanvasScene | null;
  /** The document sheet (editor), rendered on the canvas at the page position. */
  page: ReactNode;
  /** Ids of drawings currently present in the document, to offer "Remove" instead of "Include". */
  includedDrawingIds: ReadonlySet<string>;
  /** Inserts (or moves) a drawing image in the document. */
  onIncludeDrawing: (imageSource: string, drawingId: string, dropPoint?: DropPoint) => void;
  onRemoveDrawing: (drawingId: string) => void;
  /** Lets the editor include the canvas selection when the "include" chip is dropped on the page. */
  includeSelectionRef: React.RefObject<((dropPoint?: DropPoint) => Promise<void>) | null>;
  /** Lets the editor pan the canvas so the text cursor stays visible while typing. */
  revealScreenRectRef: React.RefObject<((rect: { top: number; bottom: number }) => void) | null>;
  onPrint: () => void;
  onExportMarkdown: () => void;
}

/**
 * Infinite whiteboard (Excalidraw) with the document page floating on it.
 * The page is a regular DOM element positioned with the canvas' scroll and zoom, so the rich-text
 * editor keeps working normally while drawings live around it.
 *
 * Two modes: writing (default: canvas UI hidden, drawings visible but not editable) and drawing
 * (Excalidraw's toolbar and properties appear).
 */
export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const { documentId, canEdit, initialScene, page, includedDrawingIds, onIncludeDrawing, onRemoveDrawing } = props;
  const { includeSelectionRef, revealScreenRectRef, onPrint, onExportMarkdown } = props;
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Also kept as state: useHandleLibrary only starts once the API exists.
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const pagePositionRef = useRef<Point>(initialScene?.pagePosition ?? PAGE_ORIGIN);
  const [pagePosition, setPagePosition] = useState<Point>(pagePositionRef.current);
  const [viewport, setViewport] = useState<CanvasViewport>({ scrollX: 0, scrollY: 0, zoom: 1 });
  // Coming back from libraries.excalidraw.com ("#addLibrary=…"): open in drawing mode, because the
  // library sidebar that shows the installed items is hidden in writing (view) mode.
  const [isDrawing, setIsDrawing] = useState(() => canEdit && parseLibraryTokensFromUrl() !== null);
  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;
  const [selection, setSelection] = useState<{ size: number; drawingId: string | null }>({ size: 0, drawingId: null });
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const { isLocked, toggleLock } = usePageLock(documentId);
  const { theme } = useTheme();
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Installs libraries returned by libraries.excalidraw.com and persists the library in this browser.
  useHandleLibrary({ excalidrawAPI, adapter: libraryStorageAdapter });
  useEffect(() => nameWindowForLibraryReturns(), []);

  // The page controls sit bottom-right; while Excalidraw's sidebar (library) is open they move left of
  // it, so they never cover its footer ("Browse libraries").
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(0);
  useLayoutEffect(() => {
    const sidebar = isSidebarOpen ? workspaceRef.current?.querySelector<HTMLElement>('.excalidraw .sidebar') : null;
    // offsetWidth is 0 in writing mode, where the sidebar is hidden with the rest of Excalidraw's UI.
    setSidebarWidth(sidebar?.offsetWidth ?? 0);
  }, [isSidebarOpen, isDrawing]);

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

  /**
   * Exports the canvas selection into the document. Elements are tagged with a drawing id (in
   * Excalidraw's customData) so selecting them later offers "Remove from document".
   */
  const includeSelection = useCallback(
    async (dropPoint?: DropPoint) => {
      const excalidrawAPI = excalidrawAPIRef.current;
      if (!excalidrawAPI) {
        return;
      }
      const appState = excalidrawAPI.getAppState();
      const elements = collectElementsForExport(excalidrawAPI.getSceneElements(), appState.selectedElementIds);
      if (elements.length === 0) {
        return;
      }
      const drawingId = sharedDrawingId(elements) ?? crypto.randomUUID();
      const imageSource = await exportElementsAsImage(elements, appState, excalidrawAPI.getFiles());

      const elementIds = new Set(elements.map((element) => element.id));
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElementsIncludingDeleted().map((element) =>
          elementIds.has(element.id) && element.customData?.[INCLUDED_DRAWING_KEY] !== drawingId
            ? newElementWith(element, { customData: { ...element.customData, [INCLUDED_DRAWING_KEY]: drawingId } })
            : element,
        ),
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      setSelection({ size: elements.length, drawingId });
      onIncludeDrawing(imageSource, drawingId, dropPoint);
    },
    [onIncludeDrawing],
  );

  useLayoutEffect(() => {
    includeSelectionRef.current = includeSelection;
    return () => {
      includeSelectionRef.current = null;
    };
  }, [includeSelection, includeSelectionRef]);

  /**
   * Pans the canvas vertically just enough to show a screen rectangle (the text cursor).
   * Replaces the browser's own scrolling, which would shift the whole workspace instead.
   */
  const revealScreenRect = useCallback(
    (rect: { top: number; bottom: number }) => {
      const workspaceBounds = workspaceRef.current?.getBoundingClientRect();
      if (!workspaceBounds) {
        return;
      }
      const comfortMargin = 96;
      let overflow = 0;
      if (rect.bottom > workspaceBounds.bottom - comfortMargin) {
        overflow = rect.bottom - (workspaceBounds.bottom - comfortMargin);
      } else if (rect.top < workspaceBounds.top + comfortMargin) {
        overflow = rect.top - (workspaceBounds.top + comfortMargin);
      }
      if (overflow !== 0) {
        const current = viewportRef.current;
        applyViewport({ ...current, scrollY: current.scrollY - overflow / current.zoom });
      }
    },
    [applyViewport],
  );

  useLayoutEffect(() => {
    revealScreenRectRef.current = revealScreenRect;
    return () => {
      revealScreenRectRef.current = null;
    };
  }, [revealScreenRect, revealScreenRectRef]);

  const isOverPage = useCallback((clientX: number, clientY: number) => {
    const pageBounds = pageRef.current?.getBoundingClientRect();
    return (
      !!pageBounds &&
      clientX >= pageBounds.left &&
      clientX <= pageBounds.right &&
      clientY >= pageBounds.top &&
      clientY <= pageBounds.bottom
    );
  }, []);

  /** Dragging selected drawings and releasing them over the page includes them at that spot. */
  const handleCanvasPointerUp = useCallback(
    (excalidrawAPI: ExcalidrawImperativeAPI) =>
      excalidrawAPI.onPointerUp((activeTool, pointerDownState, event) => {
        setIsDropTargetActive(false);
        const draggedSelection =
          activeTool.type === 'selection' && pointerDownState.drag.hasOccurred && pointerDownState.hit.element;
        if (!isDrawingRef.current || !draggedSelection || !isOverPage(event.clientX, event.clientY)) {
          return;
        }
        excalidrawAPI.updateScene({
          elements: restoreDraggedElements(
            excalidrawAPI.getSceneElementsIncludingDeleted(),
            pointerDownState.originalElements,
          ),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        // Read through the ref: this listener is registered once, so it must not capture a stale callback.
        void includeSelectionRef.current?.({ clientX: event.clientX, clientY: event.clientY });
      }),
    [includeSelectionRef, isOverPage],
  );

  // Wheel over the page navigates the canvas, exactly like wheel over the drawings.
  const pageLayerRef = useRef<HTMLDivElement>(null);
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

  // Esc leaves drawing mode once nothing is selected (Excalidraw uses the first Esc to deselect).
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || !isDrawing) {
      return;
    }
    function leaveDrawingOnEscape(event: KeyboardEvent) {
      const appState = excalidrawAPIRef.current?.getAppState();
      const hasSelection = Object.values(appState?.selectedElementIds ?? {}).some(Boolean);
      if (event.key === 'Escape' && !hasSelection && !appState?.editingTextElement) {
        setIsDrawing(false);
      }
    }
    workspace.addEventListener('keydown', leaveDrawingOnEscape, true);
    return () => workspace.removeEventListener('keydown', leaveDrawingOnEscape, true);
  }, [isDrawing]);

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
  const isSelectionIncluded = selection.drawingId !== null && includedDrawingIds.has(selection.drawingId);

  return (
    <div
      ref={workspaceRef}
      data-drawing={isDrawing}
      className="canvas-grid canvas-workspace relative isolate flex-1 overflow-clip"
      style={gridBackgroundStyle(viewport)}
    >
      <Excalidraw
        excalidrawAPI={(excalidrawAPI) => {
          excalidrawAPIRef.current = excalidrawAPI;
          setExcalidrawAPI(excalidrawAPI);
          handleCanvasPointerUp(excalidrawAPI);
          // Start with the page centered, whatever position it was saved at.
          requestAnimationFrame(() => centerOnPage(pagePositionRef.current));
        }}
        initialData={{
          elements: (initialScene?.elements ?? []) as never,
          files: (initialScene?.files ?? {}) as never,
          appState: { viewBackgroundColor: 'transparent', currentItemFontFamily: 1 },
        }}
        viewModeEnabled={!canEdit || !isDrawing}
        // Controlled by the app's theme toggle (Excalidraw then hides its own toggle). Drawings included
        // in the document are still exported in light colors (see export-drawing.ts).
        theme={theme}
        onScrollChange={(scrollX, scrollY, zoom) => setViewport({ scrollX, scrollY, zoom: zoom.value })}
        onPointerUpdate={({ pointer, button }) => {
          const appState = excalidrawAPIRef.current?.getAppState();
          const workspaceBounds = workspaceRef.current?.getBoundingClientRect();
          if (!appState || !workspaceBounds) {
            return;
          }
          const isDraggingSelection = button === 'down' && appState.selectedElementsAreBeingDragged;
          const clientX = workspaceBounds.left + (pointer.x + appState.scrollX) * appState.zoom.value;
          const clientY = workspaceBounds.top + (pointer.y + appState.scrollY) * appState.zoom.value;
          const shouldHighlight = isDraggingSelection && isOverPage(clientX, clientY);
          setIsDropTargetActive((wasActive) => (wasActive === shouldHighlight ? wasActive : shouldHighlight));
        }}
        onChange={(elements, appState) => {
          setIsSidebarOpen(appState.openSidebar !== null);
          const selectedElements = collectElementsForExport(elements, appState.selectedElementIds);
          const nextSelection = { size: selectedElements.length, drawingId: sharedDrawingId(selectedElements) };
          setSelection((previous) =>
            previous.size === nextSelection.size && previous.drawingId === nextSelection.drawingId ? previous : nextSelection,
          );
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
      <div
        ref={pageLayerRef}
        className="pointer-events-none absolute inset-0 z-3 overflow-clip"
        // Clicking the page means "back to writing".
        onPointerDown={() => isDrawing && setIsDrawing(false)}
      >
        <div
          ref={pageRef}
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
          <div className={isDropTargetActive ? 'rounded-sm ring-4 ring-primary/60 ring-offset-2' : undefined}>{page}</div>
          {isDropTargetActive && (
            <p className="print-hidden mt-2 text-center text-sm font-medium text-primary">Release to include in the document</p>
          )}
        </div>
      </div>

      <CanvasControls
        isLocked={isLocked}
        canEdit={canEdit}
        isDrawing={isDrawing}
        canvasSaveStatus={canvasAutosave.status}
        rightOffset={sidebarWidth}
        onToggleDrawing={() => setIsDrawing((wasDrawing) => !wasDrawing)}
        onToggleLock={toggleLock}
        onResetPosition={resetPagePosition}
        onPrint={onPrint}
        onExportMarkdown={onExportMarkdown}
      />
      {canEdit && isDrawing && selection.size > 0 && (
        <IncludeDrawingChip
          isIncluded={isSelectionIncluded}
          onInclude={() => void includeSelection()}
          onRemove={() => selection.drawingId && onRemoveDrawing(selection.drawingId)}
        />
      )}
    </div>
  );
}
