import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { currentUserId, sessionSecurity } from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import {
  createDocumentBodySchema,
  documentDetailSchema,
  documentIdParamsSchema,
  documentListSchema,
  updateDocumentBodySchema,
} from './document.schemas.js';
import type { DocumentsService } from './documents.service.js';

interface DocumentsRoutesOptions {
  documentsService: DocumentsService;
}

export const documentsRoutes: FastifyPluginAsyncZod<DocumentsRoutesOptions> = async (app, options) => {
  const { documentsService } = options;
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/api/documents',
    {
      schema: {
        tags: ['documents'],
        summary: 'List my documents and documents shared with me',
        security: sessionSecurity,
        response: { 200: documentListSchema, 401: errorResponseSchema },
      },
    },
    async (request) => documentsService.listForUser(currentUserId(request)),
  );

  app.post(
    '/api/documents',
    {
      schema: {
        tags: ['documents'],
        summary: 'Create a document',
        description:
          'Creates a document owned by the signed-in user: empty, or prefilled from a template ' +
          '(400 for an unknown templateId).',
        security: sessionSecurity,
        body: createDocumentBodySchema,
        response: { 201: documentDetailSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const document = await documentsService.createDocument(currentUserId(request), request.body);
      return reply.status(201).send(document);
    },
  );

  app.get(
    '/api/documents/:documentId',
    {
      schema: {
        tags: ['documents'],
        summary: 'Open a document',
        description: 'Returns 404 both for missing documents and documents the user cannot access.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        response: {
          200: documentDetailSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => documentsService.getDocument(currentUserId(request), request.params.documentId),
  );

  app.patch(
    '/api/documents/:documentId',
    {
      schema: {
        tags: ['documents'],
        summary: 'Rename and/or save document content',
        description:
          'Requires owner or editor access. `version` must match the stored version, ' +
          'otherwise 409 is returned so concurrent edits are never silently overwritten. ' +
          'Content HTML is sanitized before storage.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        body: updateDocumentBodySchema,
        response: {
          200: documentDetailSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) =>
      documentsService.updateDocument(currentUserId(request), request.params.documentId, request.body),
  );

  app.delete(
    '/api/documents/:documentId',
    {
      schema: {
        tags: ['documents'],
        summary: 'Delete a document',
        description: 'Owner only. Also removes every share of the document.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        response: {
          204: z.null().describe('Deleted'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await documentsService.deleteDocument(currentUserId(request), request.params.documentId);
      return reply.status(204).send(null);
    },
  );
};
