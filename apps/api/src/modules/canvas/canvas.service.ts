import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { documents } from '../../db/schema.js';
import { canEdit } from '../../lib/access-control.js';
import { forbidden } from '../../lib/errors.js';
import { loadAccessibleDocument } from '../documents/document-access.js';
import type { CanvasScene } from './canvas.schemas.js';

export function createCanvasService(db: Database) {
  /** Anyone who can open the document sees its canvas. */
  async function getCanvas(userId: string, documentId: string): Promise<CanvasScene | null> {
    await loadAccessibleDocument(db, userId, documentId);
    const [row] = await db
      .select({ canvasScene: documents.canvasScene })
      .from(documents)
      .where(eq(documents.id, documentId));
    return row?.canvasScene ?? null;
  }

  /**
   * Replaces the whole scene (last write wins). Unlike document text, the canvas has no version check:
   * it is a scratch area, and Excalidraw scenes cannot be merged meaningfully without real-time sync.
   */
  async function saveCanvas(userId: string, documentId: string, scene: CanvasScene): Promise<CanvasScene> {
    const { access } = await loadAccessibleDocument(db, userId, documentId);
    if (!canEdit(access)) {
      throw forbidden('You have view-only access to this document.');
    }
    await db.update(documents).set({ canvasScene: scene }).where(eq(documents.id, documentId));
    return scene;
  }

  return { getCanvas, saveCanvas };
}

export type CanvasService = ReturnType<typeof createCanvasService>;
