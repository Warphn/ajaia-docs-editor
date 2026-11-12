import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  currentUserId,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  sessionSecurity,
} from '../../lib/authentication.js';
import { errorResponseSchema } from '../../lib/errors.js';
import { publicUserSchema } from '../users/user.schemas.js';
import type { AuthService } from './auth.service.js';

interface AuthRoutesOptions {
  authService: AuthService;
  isProduction: boolean;
}

const userResponseSchema = z.object({ user: publicUserSchema });

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, options) => {
  const { authService, isProduction } = options;
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
  };

  app.post(
    '/api/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in with email and password',
        description: `Sets the \`${SESSION_COOKIE_NAME}\` httpOnly session cookie used by every other endpoint.`,
        body: z.object({
          email: z.email().describe('Account email, e.g. alice@ajaia.dev'),
          password: z.string().min(1).describe('Account password (demo accounts use "demo1234")'),
        }),
        response: { 200: userResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await authService.verifyCredentials(request.body.email, request.body.password);
      const token = await reply.jwtSign({ sub: user.id });
      reply.setCookie(SESSION_COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_DURATION_SECONDS });
      return { user };
    },
  );

  app.post(
    '/api/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign out',
        description: 'Clears the session cookie. Succeeds even when no session exists.',
        response: { 204: z.null().describe('Signed out') },
      },
    },
    async (_request, reply) => {
      reply.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/api/auth/me',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['auth'],
        summary: 'Get the signed-in user',
        security: sessionSecurity,
        response: { 200: userResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => ({ user: await authService.getUserById(currentUserId(request)) }),
  );
};
