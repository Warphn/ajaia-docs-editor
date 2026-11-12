import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../../db/client.js';
import { documentShares, users, type ShareRole } from '../../db/schema.js';
import { canManageSharing } from '../../lib/access-control.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { loadAccessibleDocument } from '../documents/document-access.js';
import { normalizeEmail, publicUserSchema } from '../users/user.schemas.js';

export const shareRoleSchema = z.enum(['viewer', 'editor']).describe('viewer = read-only, editor = can edit');

export const shareSchema = z.object({
  user: publicUserSchema,
  role: shareRoleSchema,
  createdAt: z.string().describe('ISO 8601 timestamp'),
});

export type Share = z.infer<typeof shareSchema>;

export interface ShareDocumentInput {
  email: string;
  role: ShareRole;
}

export function createSharesService(db: Database) {
  /** Anyone with access can see who else has access (like Google Docs); only the owner can change it. */
  async function listShares(userId: string, documentId: string): Promise<Share[]> {
    await loadAccessibleDocument(db, userId, documentId);

    const rows = await db
      .select({
        user: { id: users.id, email: users.email, name: users.name },
        role: documentShares.role,
        createdAt: documentShares.createdAt,
      })
      .from(documentShares)
      .innerJoin(users, eq(users.id, documentShares.userId))
      .where(eq(documentShares.documentId, documentId))
      .orderBy(asc(users.name));

    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  /** Grants access to a user by email, or changes their role if the document is already shared with them. */
  async function shareDocument(userId: string, documentId: string, input: ShareDocumentInput): Promise<Share> {
    const { document } = await requireOwner(userId, documentId);

    const [recipient] = await db.select().from(users).where(eq(users.email, normalizeEmail(input.email)));
    if (!recipient) {
      throw notFound(`No user found with email "${input.email}".`);
    }
    if (recipient.id === document.ownerId) {
      throw badRequest('You already own this document.');
    }

    const [share] = await db
      .insert(documentShares)
      .values({ documentId, userId: recipient.id, role: input.role })
      .onConflictDoUpdate({
        target: [documentShares.documentId, documentShares.userId],
        set: { role: input.role },
      })
      .returning();

    return {
      user: { id: recipient.id, email: recipient.email, name: recipient.name },
      role: share!.role,
      createdAt: share!.createdAt.toISOString(),
    };
  }

  async function revokeShare(userId: string, documentId: string, recipientUserId: string): Promise<void> {
    await requireOwner(userId, documentId);

    const removed = await db
      .delete(documentShares)
      .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, recipientUserId)))
      .returning({ userId: documentShares.userId });

    if (removed.length === 0) {
      throw notFound('This document is not shared with that user.');
    }
  }

  async function requireOwner(userId: string, documentId: string) {
    const accessibleDocument = await loadAccessibleDocument(db, userId, documentId);
    if (!canManageSharing(accessibleDocument.access)) {
      throw forbidden('Only the owner can change who has access to this document.');
    }
    return accessibleDocument;
  }

  return { listShares, shareDocument, revokeShare };
}

export type SharesService = ReturnType<typeof createSharesService>;
