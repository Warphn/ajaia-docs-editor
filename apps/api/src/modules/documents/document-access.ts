import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { documents, documentShares, users, type DocumentRecord } from '../../db/schema.js';
import { resolveAccess, type DocumentAccess } from '../../lib/access-control.js';
import { notFound } from '../../lib/errors.js';
import type { PublicUser } from '../users/user.schemas.js';

export interface AccessibleDocument {
  document: DocumentRecord;
  owner: PublicUser;
  access: DocumentAccess;
}

export const DOCUMENT_NOT_FOUND_MESSAGE = 'Document not found or you do not have access to it.';

/**
 * Loads a document together with the caller's access level.
 * Documents the user cannot see produce the same 404 as missing ones, so ids of private documents never leak.
 */
export async function loadAccessibleDocument(
  db: Database,
  userId: string,
  documentId: string,
): Promise<AccessibleDocument> {
  const [row] = await db
    .select({
      document: documents,
      owner: { id: users.id, email: users.email, name: users.name },
      shareRole: documentShares.role,
    })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .leftJoin(
      documentShares,
      and(eq(documentShares.documentId, documents.id), eq(documentShares.userId, userId)),
    )
    .where(eq(documents.id, documentId));

  const access = row
    ? resolveAccess({ userId, ownerId: row.document.ownerId, shareRole: row.shareRole })
    : null;

  if (!row || !access) {
    throw notFound(DOCUMENT_NOT_FOUND_MESSAGE);
  }

  return { document: row.document, owner: row.owner, access };
}
