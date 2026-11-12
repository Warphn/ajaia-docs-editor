import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { currentUserId, sessionSecurity } from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import { documentIdParamsSchema } from '../documents/document.schemas.js';
import { canvasResponseSchema, canvasSceneSchema, MAX_CANVAS_BODY_BYTES } from './canvas.schemas.js';
import type { CanvasService } from './canvas.service.js';

interface CanvasRoutesOptions {
  canvasService: CanvasService;
}

export const canvasRoutes: FastifyPluginAsyncZod<CanvasRoutesOptions> = async (app, options) => {
  const { canvasService } = options;
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/api/documents/:documentId/canvas',
    {
      schema: {
        tags: ['canvas'],
        summary: 'Load the whiteboard around a document',
        description: 'Drawings and page position. Available to anyone with access to the document.',
        security: sessionSecurity,
        params: documentIdParamsSchema,
        response: { 200: canvasResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (request) => ({
      scene: await canvasService.getCanvas(currentUserId(request), request.params.documentId),
    }),
  );

  app.put(
    '/api/documents/:documentId/canvas',
    {
      bodyLimit: MAX_CANVAS_BODY_BYTES,
      schema: {
        tags: ['canvas'],
        summary: 'Save the whiteboard around a document',
        description:
          'Owner or editor only. Replaces the whole scene (last write wins). ' +
          `Max ${MAX_CANVAS_BODY_BYTES / (1024 * 1024)} MB. The canvas is never part of the printed document.`,
        security: sessionSecurity,
        params: documentIdParamsSchema,
        body: canvasSceneSchema,
        response: {
          200: canvasResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          413: errorResponseSchema,
        },
      },
    },
    async (request) => ({
      scene: await canvasService.saveCanvas(currentUserId(request), request.params.documentId, request.body),
    }),
  );
};
