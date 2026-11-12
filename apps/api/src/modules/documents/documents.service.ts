import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { documents, documentShares, users, type DocumentRecord } from '../../db/schema.js';
import { canDelete, canEdit, type DocumentAccess } from '../../lib/access-control.js';
import { badRequest, conflict, forbidden } from '../../lib/errors.js';
import { sanitizeDocumentHtml } from '../../lib/sanitize-html.js';
import { findTemplate } from '../templates/template-catalog.js';
import type { PublicUser } from '../users/user.schemas.js';
import { loadAccessibleDocument } from './document-access.js';
import {
  DEFAULT_DOCUMENT_TITLE,
  type DocumentDetail,
  type DocumentList,
  type DocumentSummary,
  type UpdateDocumentInput,
} from './document.schemas.js';

export interface CreateDocumentInput {
  title?: string | undefined;
  contentHtml?: string | undefined;
  templateId?: string | undefined;
}

const ownerColumns = { id: users.id, email: users.email, name: users.name };

export function createDocumentsService(db: Database) {
  async function listForUser(userId: string): Promise<DocumentList> {
    const ownedRows = await db
      .select({ document: documents, owner: ownerColumns })
      .from(documents)
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documents.ownerId, userId))
      .orderBy(desc(documents.updatedAt));

    const sharedRows = await db
      .select({ document: documents, owner: ownerColumns, role: documentShares.role })
      .from(documentShares)
      .innerJoin(documents, eq(documents.id, documentShares.documentId))
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documentShares.userId, userId))
      .orderBy(desc(documents.updatedAt));

    return {
      owned: ownedRows.map((row) => toSummary(row.document, row.owner, 'owner')),
      sharedWithMe: sharedRows.map((row) => toSummary(row.document, row.owner, row.role)),
    };
  }

  async function createDocument(userId: string, input: CreateDocumentInput): Promise<DocumentDetail> {
    const template = input.templateId === undefined ? undefined : findTemplate(input.templateId);
    if (input.templateId !== undefined && !template) {
      throw badRequest(`Unknown template "${input.templateId}".`);
    }

    const [created] = await db
      .insert(documents)
      .values({
        ownerId: userId,
        title: input.title?.trim() || template?.defaultTitle || DEFAULT_DOCUMENT_TITLE,
        contentHtml: sanitizeDocumentHtml(input.contentHtml ?? template?.contentHtml ?? ''),
      })
      .returning();
    return getDocument(userId, created!.id);
  }

  async function getDocument(userId: string, documentId: string): Promise<DocumentDetail> {
    const { document, owner, access } = await loadAccessibleDocument(db, userId, documentId);
    return toDetail(document, owner, access);
  }

  async function updateDocument(
    userId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetail> {
    const { owner, access } = await loadAccessibleDocument(db, userId, documentId);
    if (!canEdit(access)) {
      throw forbidden('You have view-only access to this document.');
    }

    const [updated] = await db
      .update(documents)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.contentHtml !== undefined && { contentHtml: sanitizeDocumentHtml(input.contentHtml) }),
        version: sql`${documents.version} + 1`,
        updatedAt: new Date(),
      })
      // Optimistic concurrency: the write only lands if nobody saved since the client's version.
      .where(and(eq(documents.id, documentId), eq(documents.version, input.version)))
      .returning();

    if (!updated) {
      throw conflict('This document was changed by someone else. Reload to get the latest version.');
    }
    return toDetail(updated, owner, access);
  }

  async function deleteDocument(userId: string, documentId: string): Promise<void> {
    const { access } = await loadAccessibleDocument(db, userId, documentId);
    if (!canDelete(access)) {
      throw forbidden('Only the owner can delete this document.');
    }
    await db.delete(documents).where(eq(documents.id, documentId));
  }

  return { listForUser, createDocument, getDocument, updateDocument, deleteDocument };
}

export type DocumentsService = ReturnType<typeof createDocumentsService>;

function toSummary(document: DocumentRecord, owner: PublicUser, access: DocumentAccess): DocumentSummary {
  return {
    id: document.id,
    title: document.title,
    access,
    owner,
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toDetail(document: DocumentRecord, owner: PublicUser, access: DocumentAccess): DocumentDetail {
  return {
    ...toSummary(document, owner, access),
    contentHtml: document.contentHtml,
    version: document.version,
    createdAt: document.createdAt.toISOString(),
  };
}
