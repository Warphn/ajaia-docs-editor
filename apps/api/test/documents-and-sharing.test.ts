import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../src/db/seed.js';
import { SESSION_COOKIE_NAME } from '../src/lib/authentication.js';
import { createTestApp, type TestContext } from './test-app.js';

/**
 * End-to-end API flow on a real (in-memory) Postgres:
 * Alice creates and edits a document, shares it with Bob as viewer then editor, Carol never sees it.
 */
describe('documents and sharing', () => {
  let context: TestContext;
  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;
  let documentId: string;
  let currentVersion: number;

  async function signIn(email: string): Promise<string> {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: DEMO_PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    const sessionCookie = response.cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
    return `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`;
  }

  function request(cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) {
    return context.app.inject({ method, url, headers: { cookie }, ...(payload && { payload }) });
  }

  beforeAll(async () => {
    context = await createTestApp();
    aliceCookie = await signIn('alice@ajaia.dev');
    bobCookie = await signIn('bob@ajaia.dev');
    carolCookie = await signIn('carol@ajaia.dev');
  });

  afterAll(async () => {
    await context.close();
  });

  describe('authentication', () => {
    it('rejects a wrong password with 401 and a generic message', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'alice@ajaia.dev', password: 'wrong-password' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    });

    it('returns 401 for document routes without a session', async () => {
      const response = await context.app.inject({ method: 'GET', url: '/api/documents' });

      expect(response.statusCode).toBe(401);
    });

    it('returns the signed-in user from /api/auth/me', async () => {
      const response = await request(aliceCookie, 'GET', '/api/auth/me');

      expect(response.json().user).toMatchObject({ email: 'alice@ajaia.dev', name: 'Alice Martins' });
    });
  });

  describe('document lifecycle', () => {
    it('creates a document owned by the caller with a default title', async () => {
      const response = await request(aliceCookie, 'POST', '/api/documents', {});

      expect(response.statusCode).toBe(201);
      const document = response.json();
      expect(document).toMatchObject({ title: 'Untitled document', access: 'owner', contentHtml: '', version: 1 });
      documentId = document.id;
      currentVersion = document.version;
    });

    it('rejects an empty title with 400', async () => {
      const response = await request(aliceCookie, 'PATCH', `/api/documents/${documentId}`, {
        title: '   ',
        version: currentVersion,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('VALIDATION_ERROR');
    });

    it('saves title and sanitized content, bumping the version', async () => {
      const response = await request(aliceCookie, 'PATCH', `/api/documents/${documentId}`, {
        title: 'Q3 Roadmap',
        contentHtml: '<h1>Roadmap</h1><p><strong>Ship</strong> it</p><script>alert(1)</script>',
        version: currentVersion,
      });

      expect(response.statusCode).toBe(200);
      const document = response.json();
      expect(document.title).toBe('Q3 Roadmap');
      expect(document.contentHtml).toBe('<h1>Roadmap</h1><p><strong>Ship</strong> it</p>');
      expect(document.version).toBe(currentVersion + 1);
      currentVersion = document.version;
    });

    it('persists the content so reopening returns the same formatting', async () => {
      const response = await request(aliceCookie, 'GET', `/api/documents/${documentId}`);

      expect(response.json().contentHtml).toBe('<h1>Roadmap</h1><p><strong>Ship</strong> it</p>');
    });

    it('returns 409 when saving on top of a stale version', async () => {
      const response = await request(aliceCookie, 'PATCH', `/api/documents/${documentId}`, {
        contentHtml: '<p>Overwrite attempt</p>',
        version: currentVersion - 1,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('sharing', () => {
    it('hides an unshared document from other users with 404', async () => {
      const response = await request(bobCookie, 'GET', `/api/documents/${documentId}`);

      expect(response.statusCode).toBe(404);
    });

    it('lets the owner share with a viewer, who sees it under "shared with me"', async () => {
      const shareResponse = await request(aliceCookie, 'POST', `/api/documents/${documentId}/shares`, {
        email: 'bob@ajaia.dev',
        role: 'viewer',
      });
      expect(shareResponse.statusCode).toBe(200);

      const list = (await request(bobCookie, 'GET', '/api/documents')).json();
      const sharedDocument = list.sharedWithMe.find((document: { id: string }) => document.id === documentId);
      expect(sharedDocument).toMatchObject({ access: 'viewer', owner: { email: 'alice@ajaia.dev' } });
      expect(list.owned.some((document: { id: string }) => document.id === documentId)).toBe(false);
    });

    it('lets a viewer read but not edit (403)', async () => {
      const readResponse = await request(bobCookie, 'GET', `/api/documents/${documentId}`);
      expect(readResponse.statusCode).toBe(200);
      expect(readResponse.json().access).toBe('viewer');

      const editResponse = await request(bobCookie, 'PATCH', `/api/documents/${documentId}`, {
        contentHtml: '<p>Bob was here</p>',
        version: currentVersion,
      });
      expect(editResponse.statusCode).toBe(403);
    });

    it('lets an editor save changes after the owner upgrades their role', async () => {
      await request(aliceCookie, 'POST', `/api/documents/${documentId}/shares`, {
        email: 'bob@ajaia.dev',
        role: 'editor',
      });

      const editResponse = await request(bobCookie, 'PATCH', `/api/documents/${documentId}`, {
        contentHtml: '<p>Bob was here</p>',
        version: currentVersion,
      });
      expect(editResponse.statusCode).toBe(200);
      currentVersion = editResponse.json().version;
    });

    it('does not let a non-owner manage sharing or delete', async () => {
      const shareResponse = await request(bobCookie, 'POST', `/api/documents/${documentId}/shares`, {
        email: 'carol@ajaia.dev',
        role: 'editor',
      });
      expect(shareResponse.statusCode).toBe(403);

      const deleteResponse = await request(bobCookie, 'DELETE', `/api/documents/${documentId}`);
      expect(deleteResponse.statusCode).toBe(403);
    });

    it('returns 404 when sharing with an email that has no account', async () => {
      const response = await request(aliceCookie, 'POST', `/api/documents/${documentId}/shares`, {
        email: 'nobody@ajaia.dev',
        role: 'viewer',
      });

      expect(response.statusCode).toBe(404);
    });

    it('keeps the document invisible to a user it was never shared with', async () => {
      const response = await request(carolCookie, 'GET', `/api/documents/${documentId}`);

      expect(response.statusCode).toBe(404);
    });

    it('removes access when the owner revokes the share', async () => {
      const sharesBefore = (await request(aliceCookie, 'GET', `/api/documents/${documentId}/shares`)).json();
      const bobUserId = sharesBefore.shares[0].user.id;

      const revokeResponse = await request(aliceCookie, 'DELETE', `/api/documents/${documentId}/shares/${bobUserId}`);
      expect(revokeResponse.statusCode).toBe(204);

      const readResponse = await request(bobCookie, 'GET', `/api/documents/${documentId}`);
      expect(readResponse.statusCode).toBe(404);
    });

    it('lets the owner delete the document', async () => {
      const deleteResponse = await request(aliceCookie, 'DELETE', `/api/documents/${documentId}`);
      expect(deleteResponse.statusCode).toBe(204);

      const readResponse = await request(aliceCookie, 'GET', `/api/documents/${documentId}`);
      expect(readResponse.statusCode).toBe(404);
    });
  });
});
