import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/** Ids of canvas drawings currently included in the document, in document order. */
export function collectDrawingIds(doc: ProseMirrorNode): string[] {
  const drawingIds: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'image' && typeof node.attrs.drawingId === 'string') {
      drawingIds.push(node.attrs.drawingId);
    }
  });
  return drawingIds;
}

/** Deletes every image that came from the given canvas drawing. Returns whether anything was removed. */
export function removeDrawingImages(editor: Editor, drawingId: string): boolean {
  const positions: number[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === 'image' && node.attrs.drawingId === drawingId) {
      positions.push(position);
    }
  });
  if (positions.length === 0) {
    return false;
  }
  const transaction = editor.state.tr;
  // Delete from the end so earlier positions stay valid.
  for (const position of positions.reverse()) {
    const node = transaction.doc.nodeAt(position);
    if (node) {
      transaction.delete(position, position + node.nodeSize);
    }
  }
  editor.view.dispatch(transaction);
  return true;
}

/**
 * Position between top-level blocks closest to a screen point: before the block under the pointer
 * when dropped on its upper half, after it otherwise. Drawings never split a paragraph or list.
 */
function blockBoundaryAt(editor: Editor, point: { clientX: number; clientY: number }): number | undefined {
  const position = editor.view.posAtCoords({ left: point.clientX, top: point.clientY })?.pos;
  if (position === undefined) {
    return undefined;
  }
  const resolved = editor.state.doc.resolve(position);
  if (resolved.depth === 0) {
    return position;
  }
  const blockStart = resolved.before(1);
  const blockElement = editor.view.nodeDOM(blockStart);
  const blockBounds = blockElement instanceof HTMLElement ? blockElement.getBoundingClientRect() : null;
  const isUpperHalf = blockBounds ? point.clientY < blockBounds.top + blockBounds.height / 2 : false;
  return isUpperHalf ? blockStart : resolved.after(1);
}

/**
 * Inserts a drawing image at a screen point (drag and drop) or at the cursor. A drawing that is
 * already in the document is replaced, so dropping it again moves/updates it instead of duplicating.
 */
export function insertDrawingImage(
  editor: Editor,
  image: { source: string; drawingId: string },
  dropPoint?: { clientX: number; clientY: number },
) {
  removeDrawingImages(editor, image.drawingId);
  const imageNode = { type: 'image', attrs: { src: image.source, alt: 'Drawing', drawingId: image.drawingId } };
  const dropPosition = dropPoint ? blockBoundaryAt(editor, dropPoint) : undefined;

  if (dropPosition === undefined) {
    editor.chain().focus().insertContent(imageNode).run();
  } else {
    editor.chain().focus().insertContentAt(dropPosition, imageNode).run();
  }
}
