import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from './db/client.js';
import { authenticationPlugin, SESSION_COOKIE_NAME } from './lib/authentication.js';
import { AppError, type ErrorResponse } from './lib/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { documentsRoutes } from './modules/documents/documents.routes.js';
import { createDocumentsService } from './modules/documents/documents.service.js';
import { importsRoutes } from './modules/imports/imports.routes.js';
import { sharesRoutes } from './modules/shares/shares.routes.js';
import { createSharesService } from './modules/shares/shares.service.js';

export interface AppOptions {
  db: Database;
  jwtSecret: string;
  isProduction: boolean;
  /** Absolute path of the built web app; when set, the SPA is served from the same origin. */
  webDistDir?: string | undefined;
  logger?: boolean;
}

export const SWAGGER_UI_PATH = '/api/docs';

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(handleError);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Ajaia Docs API',
        description:
          'REST API for Ajaia Docs: documents, sharing, file import and templates. ' +
          'Authentication uses an httpOnly session cookie set by POST /api/auth/login.',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Sign in / sign out (seeded demo accounts)' },
        { name: 'documents', description: 'Create, open, edit, rename and delete documents' },
        { name: 'sharing', description: 'Grant, change and revoke access to a document' },
        { name: 'health', description: 'Service status' },
      ],
      components: {
        securitySchemes: {
          sessionCookie: { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE_NAME },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(fastifySwaggerUi, { routePrefix: SWAGGER_UI_PATH });
  await app.register(authenticationPlugin, { jwtSecret: options.jwtSecret });

  const authService = createAuthService(options.db);
  const documentsService = createDocumentsService(options.db);
  const sharesService = createSharesService(options.db);

  await app.register(authRoutes, { authService, isProduction: options.isProduction });
  await app.register(documentsRoutes, { documentsService });
  await app.register(importsRoutes, { documentsService });
  await app.register(sharesRoutes, { sharesService });

  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Health check',
        response: { 200: z.object({ status: z.literal('ok') }) },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  if (options.webDistDir) {
    await registerWebApp(app, options.webDistDir);
  }

  return app;
}

/** Serves the built React app; unknown non-API paths fall back to index.html for client-side routing. */
async function registerWebApp(app: FastifyInstance, webDistDir: string) {
  await app.register(fastifyStatic, { root: webDistDir, wildcard: false });

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send(toErrorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found.`));
  });
}

function handleError(error: FastifyError, _request: unknown, reply: import('fastify').FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(toErrorBody(error.errorCode, error.message));
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const details = error.validation
      .map((issue) => `${issue.instancePath || error.validationContext || 'request'}: ${issue.message}`)
      .join('; ');
    return reply.status(400).send(toErrorBody('VALIDATION_ERROR', details));
  }

  // Errors raised by Fastify itself or its plugins (e.g. body too large, bad content type) carry a 4xx status.
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send(toErrorBody(error.code ?? 'REQUEST_ERROR', error.message));
  }

  reply.log.error(error);
  return reply.status(500).send(toErrorBody('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
}

function toErrorBody(errorCode: string, message: string): ErrorResponse {
  return { error: errorCode, message };
}
