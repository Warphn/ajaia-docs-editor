# Backend

Node.js + [Fastify 5](https://fastify.dev) + TypeScript, in [`apps/api`](../apps/api).

**API documentation: Swagger UI at [`/api/docs`](http://localhost:3000/api/docs)** (raw OpenAPI JSON at `/api/docs/json`). Every route declares its body, params, responses and error responses with Zod; the same schemas validate requests and generate the OpenAPI document, so docs cannot drift from behavior.

## Structure

```
apps/api/src
  app.ts            buildApp(): plugins, routes, error handler, SPA hosting (used by server and tests)
  server.ts         process entry: config → DB connect + migrate → seed → listen
  config.ts         environment variables
  db/               schema, connection (Postgres or PGlite), seed
  lib/              cross-cutting: access-control, sanitize-html, authentication, errors
  modules/
    auth/           login, logout, me
    documents/      CRUD + document-access (single query for document + caller's access)
    shares/         list, grant/change role, revoke
    imports/        file → HTML converters + multipart route
    templates/      template catalog (in code) + list route
    users/          public user schema, email normalization
```

Each module has `*.routes.ts` (HTTP + schemas, thin) and `*.service.ts` (business rules, takes the `Database` as a dependency). Services are plain factory functions, which keeps them easy to test and avoids a DI framework.

## Routes

All routes except login/logout/health require the session cookie.

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/login` | anyone | Email + password → sets `ajaia_session` httpOnly cookie |
| POST | `/api/auth/logout` | anyone | Clears the cookie |
| GET | `/api/auth/me` | signed in | Current user |
| GET | `/api/documents` | signed in | `{ owned, sharedWithMe }` |
| POST | `/api/documents` | signed in | Create (optional `title`, optional `templateId`) |
| POST | `/api/documents/import` | signed in | Multipart `file` (.txt/.md/.docx ≤ 5 MB) → new document |
| GET | `/api/documents/:id` | any access | Document + caller's `access` + `version` |
| PATCH | `/api/documents/:id` | owner, editor | Rename and/or save content; requires current `version` |
| DELETE | `/api/documents/:id` | owner | Delete (cascades shares) |
| GET | `/api/documents/:id/shares` | any access | People with access |
| POST | `/api/documents/:id/shares` | owner | Share by email with `viewer`/`editor` (upsert) |
| DELETE | `/api/documents/:id/shares/:userId` | owner | Revoke |
| GET | `/api/templates` | signed in | Template catalog (id, name, description, audience) |
| GET | `/api/health` | anyone | Health check (used by Render) |

## Error contract

Every error is JSON `{ "error": "<CODE>", "message": "<human readable>" }`.

| Status | When |
|---|---|
| 400 `VALIDATION_ERROR` / `BAD_REQUEST` | Schema validation, empty file, corrupt .docx, sharing with yourself |
| 401 `UNAUTHORIZED` | No/invalid session, wrong credentials (same message for unknown email and wrong password) |
| 403 `FORBIDDEN` | Viewer editing; non-owner deleting or managing shares |
| 404 `NOT_FOUND` | Missing document **or no access to it** (private ids never leak); unknown share recipient |
| 409 `CONFLICT` | `version` is stale: someone saved in between |
| 413 `FILE_TOO_LARGE` / 415 `UNSUPPORTED_MEDIA_TYPE` | Import limits |
| 500 `INTERNAL_ERROR` | Unexpected; logged server-side, generic message to the client |

## Security notes

- **Stored XSS:** content (editor saves and imports) passes an allowlist sanitizer before storage ([`sanitize-html.ts`](../apps/api/src/lib/sanitize-html.ts)); links get `rel="noopener noreferrer nofollow"`.
- **Sessions:** JWT signed with `JWT_SECRET` (required in production), httpOnly, `SameSite=Lax`, `Secure` in production, 7-day expiry.
- **Passwords:** bcrypt hashes; demo password is public by design.
- Out of scope: rate limiting, CSRF tokens beyond SameSite, password reset.
