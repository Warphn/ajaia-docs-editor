import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { unauthorized } from './errors.js';

export const SESSION_COOKIE_NAME = 'ajaia_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

/** OpenAPI security requirement for routes that need a signed-in user. */
export const sessionSecurity = [{ sessionCookie: [] }];

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler that rejects the request with 401 unless a valid session cookie is present. */
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

interface AuthenticationOptions {
  jwtSecret: string;
}

/** Session = signed JWT carrying the user id, stored in an httpOnly cookie (not readable by page scripts). */
export const authenticationPlugin = fastifyPlugin<AuthenticationOptions>(
  async (app: FastifyInstance, options) => {
    await app.register(fastifyCookie);
    await app.register(fastifyJwt, {
      secret: options.jwtSecret,
      cookie: { cookieName: SESSION_COOKIE_NAME, signed: false },
      sign: { expiresIn: SESSION_DURATION_SECONDS },
    });

    app.decorate('authenticate', async (request: FastifyRequest) => {
      try {
        await request.jwtVerify();
      } catch {
        throw unauthorized();
      }
    });
  },
);

/** Id of the signed-in user. Only valid on routes guarded by `app.authenticate`. */
export function currentUserId(request: FastifyRequest): string {
  return request.user.sub;
}
