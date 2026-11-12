import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { currentUserId, sessionSecurity } from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import { documentIdParamsSchema } from '../documents/document.schemas.js';
import { shareRoleSchema, shareSchema, type SharesService } from './shares.service.js';

interface SharesRoutesOptions {
  sharesService: SharesService;
}

export const sharesRoutes: FastifyPluginAsyncZod<SharesRoutesOptions> = async (app, options) => {
  const { sharesService } = options;
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/api/documents/:documentId/shares',
    {
      schema: {
        tags: ['sharing'],
        summary: 'List who the document is shared with',
        description: 'Available to anyone with access to the document.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        response: {
          200: z.object({ shares: z.array(shareSchema) }),
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => ({
      shares: await sharesService.listShares(currentUserId(request), request.params.documentId),
    }),
  );

  app.post(
    '/api/documents/:documentId/shares',
    {
      schema: {
        tags: ['sharing'],
        summary: 'Share a document with a user (or change their role)',
        description: 'Owner only. Sharing again with the same user updates their role.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        body: z.object({
          email: z.email().describe('Email of the user to share with, e.g. bob@ajaia.dev'),
          role: shareRoleSchema,
        }),
        response: {
          200: shareSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) =>
      sharesService.shareDocument(currentUserId(request), request.params.documentId, request.body),
  );

  app.delete(
    '/api/documents/:documentId/shares/:userId',
    {
      schema: {
        tags: ['sharing'],
        summary: 'Revoke a user’s access',
        description: 'Owner only.',
        security: sessionSecurity,
        params: documentIdParamsSchema.extend({ userId: z.uuid().describe('Id of the user to remove') }),
        response: {
          204: z.null().describe('Access revoked'),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await sharesService.revokeShare(currentUserId(request), request.params.documentId, request.params.userId);
      return reply.status(204).send(null);
    },
  );
};
