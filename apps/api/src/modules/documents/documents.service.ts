import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { documentColumns, documents, documentShares, users, type DocumentRecord } from '../../db/schema.js';
import { canDelete, canEdit, type DocumentAccess } from '../../lib/access-control.js';
import { badRequest, conflict, forbidden } from '../../lib/errors.js';
import { sanitizeDocumentHtml } from '../../lib/sanitize-html.js';
import { loadMemberTeam } from '../teams/team-membership.js';
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
  /** Creates the document inside this team (the user must be a member). */
  teamId?: string | undefined;
}

const ownerColumns = { id: users.id, email: users.email, name: users.name };

export function createDocumentsService(db: Database) {
  async function listForUser(userId: string): Promise<DocumentList> {
    const ownedRows = await db
      .select({ document: documentColumns, owner: ownerColumns })
      .from(documents)
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documents.ownerId, userId))
      .orderBy(desc(documents.updatedAt));

    const sharedRows = await db
      .select({ document: documentColumns, owner: ownerColumns, role: documentShares.role })
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

  /** Every document created in the team, by any member; members can edit all of them. */
  async function listForTeam(userId: string, teamId: string): Promise<DocumentSummary[]> {
    await loadMemberTeam(db, userId, teamId);
    const rows = await db
      .select({ document: documentColumns, owner: ownerColumns })
      .from(documents)
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documents.teamId, teamId))
      .orderBy(desc(documents.updatedAt));
    return rows.map((row) => toSummary(row.document, row.owner, row.document.ownerId === userId ? 'owner' : 'editor'));
  }

  async function createDocument(userId: string, input: CreateDocumentInput): Promise<DocumentDetail> {
    const template = input.templateId === undefined ? undefined : findTemplate(input.templateId);
    if (input.templateId !== undefined && !template) {
      throw badRequest(`Unknown template "${input.templateId}".`);
    }
    if (input.teamId !== undefined) {
      await loadMemberTeam(db, userId, input.teamId);
    }

    const [created] = await db
      .insert(documents)
      .values({
        ownerId: userId,
        teamId: input.teamId ?? null,
        title: input.title?.trim() || template?.defaultTitle || DEFAULT_DOCUMENT_TITLE,
        contentHtml: sanitizeDocumentHtml(input.contentHtml ?? template?.contentHtml ?? ''),
      })
      .returning({ id: documents.id });
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
      .returning(documentColumns);

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

  return { listForUser, listForTeam, createDocument, getDocument, updateDocument, deleteDocument };
}

export type DocumentsService = ReturnType<typeof createDocumentsService>;

function toSummary(document: DocumentRecord, owner: PublicUser, access: DocumentAccess): DocumentSummary {
  return {
    id: document.id,
    title: document.title,
    access,
    owner,
    teamId: document.teamId,
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
