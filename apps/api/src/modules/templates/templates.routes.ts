import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sessionSecurity } from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import { DOCUMENT_TEMPLATES } from './template-catalog.js';

const templateSummarySchema = z.object({
  id: z.string().describe('Pass as templateId to POST /api/documents'),
  name: z.string(),
  description: z.string(),
  audience: z.string().describe('Who the document is written for'),
});

export const templatesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/templates',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['templates'],
        summary: 'List document templates',
        description: 'Starting points for common tech-team documents (specs, RFCs, status updates…).',
        security: sessionSecurity,
        response: { 200: z.object({ templates: z.array(templateSummarySchema) }), 401: errorResponseSchema },
      },
    },
    async () => ({
      templates: DOCUMENT_TEMPLATES.map(({ id, name, description, audience }) => ({ id, name, description, audience })),
    }),
  );
};
