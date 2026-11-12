/** The few Excalidraw element fields these helpers rely on (keeps them testable without the library). */
export interface SceneElement {
  id: string;
  version: number;
  isDeleted?: boolean;
  containerId?: string | null;
  groupIds?: readonly string[];
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
