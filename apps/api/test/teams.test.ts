import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../src/db/seed.js';
import { SESSION_COOKIE_NAME } from '../src/lib/authentication.js';
import { createTestApp, type TestContext } from './test-app.js';

/**
 * Team workspaces through HTTP + SQL: Carol creates a team, adds Bob, creates a document in it;
 * Bob can list and edit it, Alice (not a member) cannot see it.
 */
describe('teams', () => {
  let context: TestContext;
  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;
  let teamId: string;
  let teamDocumentId: string;

  async function signIn(email: string): Promise<string> {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: DEMO_PASSWORD },
    });
    const sessionCookie = response.cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
    return `${SESSION_COOKIE_NAME}=${sessionCookie!.value}`;
  }

  function request(cookie: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
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

  it('seeds demo teams so Alice belongs to two projects', async () => {
    const response = await request(aliceCookie, 'GET', '/api/teams');

    expect(response.statusCode).toBe(200);
    expect(response.json().teams.map((team: { name: string }) => team.name)).toEqual(['Mobile app', 'Platform']);
  });

  it('creates a team with the creator as its only member', async () => {
    const response = await request(carolCookie, 'POST', '/api/teams', { name: '  Design system  ' });

    expect(response.statusCode).toBe(201);
    expect(response.json().name).toBe('Design system');
    expect(response.json().members.map((member: { email: string }) => member.email)).toEqual(['carol@ajaia.dev']);
    teamId = response.json().id;
  });

  it('rejects an empty team name with 400', async () => {
    const response = await request(carolCookie, 'POST', '/api/teams', { name: '   ' });

    expect(response.statusCode).toBe(400);
  });

  it('lets a member add a colleague by email', async () => {
    const response = await request(carolCookie, 'POST', `/api/teams/${teamId}/members`, { email: 'BOB@ajaia.dev' });

    expect(response.statusCode).toBe(200);
    expect(response.json().members.map((member: { email: string }) => member.email)).toEqual([
      'bob@ajaia.dev',
      'carol@ajaia.dev',
    ]);
  });

  it('returns 400 when adding someone who is already a member', async () => {
    const response = await request(bobCookie, 'POST', `/api/teams/${teamId}/members`, { email: 'carol@ajaia.dev' });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 when adding an unknown email', async () => {
    const response = await request(carolCookie, 'POST', `/api/teams/${teamId}/members`, { email: 'nobody@ajaia.dev' });

    expect(response.statusCode).toBe(404);
  });

  it('returns 404 when a non-member tries to add people', async () => {
    const response = await request(aliceCookie, 'POST', `/api/teams/${teamId}/members`, { email: 'alice@ajaia.dev' });

    expect(response.statusCode).toBe(404);
  });

  it('creates a document inside the team', async () => {
    const response = await request(carolCookie, 'POST', '/api/documents', { title: 'Tokens RFC', teamId });

    expect(response.statusCode).toBe(201);
    expect(response.json().teamId).toBe(teamId);
    teamDocumentId = response.json().id;
  });

  it('refuses to create a document in a team the user is not in', async () => {
    const response = await request(aliceCookie, 'POST', '/api/documents', { title: 'Sneaky', teamId });

    expect(response.statusCode).toBe(404);
  });

  it('lists the team documents for every member, with edit access for non-owners', async () => {
    const response = await request(bobCookie, 'GET', `/api/teams/${teamId}/documents`);

    expect(response.statusCode).toBe(200);
    expect(response.json().documents).toEqual([
      expect.objectContaining({ id: teamDocumentId, title: 'Tokens RFC', access: 'editor' }),
    ]);
  });

  it('lets another member edit the team document without an explicit share', async () => {
    const opened = await request(bobCookie, 'GET', `/api/documents/${teamDocumentId}`);
    const saved = await request(bobCookie, 'PATCH', `/api/documents/${teamDocumentId}`, {
      contentHtml: '<p>Edited by Bob</p>',
      version: opened.json().version,
    });

    expect(opened.json().access).toBe('editor');
    expect(saved.statusCode).toBe(200);
  });

  it('hides the team and its documents from non-members', async () => {
    const teamDocuments = await request(aliceCookie, 'GET', `/api/teams/${teamId}/documents`);
    const document = await request(aliceCookie, 'GET', `/api/documents/${teamDocumentId}`);

    expect(teamDocuments.statusCode).toBe(404);
    expect(document.statusCode).toBe(404);
  });
});
