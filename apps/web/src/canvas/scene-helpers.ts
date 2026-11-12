/** The few Excalidraw element fields these helpers rely on (keeps them testable without the library). */
export interface SceneElement {
  id: string;
  version: number;
  isDeleted?: boolean;
  containerId?: string | null;
  groupIds?: readonly string[];
  customData?: Record<string, unknown> | undefined;
}

/** Key stored in an element's customData linking it to the image it was included as. */
export const INCLUDED_DRAWING_KEY = 'includedDrawingId';

/** The drawing id shared by every element of a selection, or null if they were never included together. */
export function sharedDrawingId(elements: readonly SceneElement[]): string | null {
  if (elements.length === 0) {
    return null;
  }
  const drawingIds = new Set(elements.map((element) => element.customData?.[INCLUDED_DRAWING_KEY]));
  const [onlyDrawingId] = drawingIds;
  return drawingIds.size === 1 && typeof onlyDrawingId === 'string' ? onlyDrawingId : null;
}

/**
 * Puts elements changed during a drag back to their state at pointer-down (dropping a drawing on the
 * page copies it into the document; the original stays where it was). Versions keep increasing so
 * Excalidraw re-renders and autosave notices the change.
 */
export function restoreDraggedElements<Element extends SceneElement>(
  currentElements: readonly Element[],
  elementsAtPointerDown: ReadonlyMap<string, Element>,
): Element[] {
  return currentElements.map((element) => {
    const original = elementsAtPointerDown.get(element.id);
    if (!original || original.version === element.version) {
      return element;
    }
    return { ...original, version: element.version + 1 };
  });
}

/**
 * Expands a canvas selection to everything that visually belongs to it:
 * text bound inside a selected shape, and every member of a selected group.
 */
export function collectElementsForExport<Element extends SceneElement>(
  elements: readonly Element[],
  selectedElementIds: Readonly<Record<string, boolean>>,
): Element[] {
  const liveElements = elements.filter((element) => !element.isDeleted);
  const selectedIds = new Set(liveElements.filter((element) => selectedElementIds[element.id]).map((element) => element.id));
  const selectedGroupIds = new Set(
    liveElements.filter((element) => selectedIds.has(element.id)).flatMap((element) => element.groupIds ?? []),
  );

  return liveElements.filter(
    (element) =>
      selectedIds.has(element.id) ||
      (element.containerId != null && selectedIds.has(element.containerId)) ||
      (element.groupIds ?? []).some((groupId) => selectedGroupIds.has(groupId)),
  );
}

/**
 * Cheap identity of what is worth saving. Excalidraw calls onChange on every pointer move and
 * selection change; comparing fingerprints avoids saving when nothing persistent changed.
 */
export function sceneFingerprint(
  elements: readonly SceneElement[],
  fileIds: readonly string[],
  pagePosition: { x: number; y: number },
): string {
  const elementVersions = elements
    .filter((element) => !element.isDeleted)
    .map((element) => `${element.id}:${element.version}`)
    .join(',');
  return `${elementVersions}|${[...fileIds].sort().join(',')}|${pagePosition.x},${pagePosition.y}`;
}
