import { z } from 'zod';
import { publicUserSchema } from '../users/user.schemas.js';

export const MAX_TITLE_LENGTH = 200;
// Drawings and imported images are embedded as data URIs, so content can reach a few megabytes.
export const MAX_CONTENT_LENGTH = 8_000_000;
/** Request size cap for document saves (content plus JSON overhead). */
export const MAX_DOCUMENT_BODY_BYTES = 10 * 1024 * 1024;
export const DEFAULT_DOCUMENT_TITLE = 'Untitled document';

export const documentAccessSchema = z
  .enum(['owner', 'editor', 'viewer'])
  .describe('Effective permission of the signed-in user on the document');

export const documentIdParamsSchema = z.object({
  documentId: z.uuid().describe('Document id'),
});

const titleSchema = z.string().trim().min(1, 'Title cannot be empty.').max(MAX_TITLE_LENGTH);

export const documentSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  access: documentAccessSchema,
  owner: publicUserSchema,
  updatedAt: z.string().describe('ISO 8601 timestamp'),
});

export const documentDetailSchema = documentSummarySchema.extend({
  contentHtml: z.string().describe('Sanitized HTML content'),
  version: z.number().int().describe('Send this back on update to detect concurrent edits'),
  createdAt: z.string().describe('ISO 8601 timestamp'),
});

export const documentListSchema = z.object({
  owned: z.array(documentSummarySchema).describe('Documents owned by the signed-in user'),
  sharedWithMe: z.array(documentSummarySchema).describe('Documents other users shared with the signed-in user'),
});

export const createDocumentBodySchema = z.object({
  title: titleSchema.optional().describe(`Defaults to the template's title, or "${DEFAULT_DOCUMENT_TITLE}"`),
  templateId: z.string().optional().describe('Start from a template (ids from GET /api/templates)'),
});

export const updateDocumentBodySchema = z
  .object({
    title: titleSchema.optional(),
    contentHtml: z.string().max(MAX_CONTENT_LENGTH).optional(),
    version: z.number().int().positive().describe('Version the client last loaded or saved'),
  })
  .refine((body) => body.title !== undefined || body.contentHtml !== undefined, {
    message: 'Provide at least one of "title" or "contentHtml".',
  });

export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type DocumentList = z.infer<typeof documentListSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentBodySchema>;
