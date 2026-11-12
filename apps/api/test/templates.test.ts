import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../src/db/seed.js';
import { SESSION_COOKIE_NAME } from '../src/lib/authentication.js';
import { createTestApp, type TestContext } from './test-app.js';

describe('templates', () => {
  let context: TestContext;
  let cookie: string;

  beforeAll(async () => {
    context = await createTestApp();
    const login = await context.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@ajaia.dev', password: DEMO_PASSWORD },
    });
    cookie = `${SESSION_COOKIE_NAME}=${login.cookies[0]!.value}`;
  });

  afterAll(async () => {
    await context.close();
  });

  it('lists templates without their content', async () => {
    const response = await context.app.inject({ method: 'GET', url: '/api/templates', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    const { templates } = response.json();
    expect(templates.map((template: { id: string }) => template.id)).toContain('incident-postmortem');
    expect(templates[0]).not.toHaveProperty('contentHtml');
  });

  it('creates a document prefilled from a template, with the template title', async () => {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { cookie },
      payload: { templateId: 'incident-postmortem' },
    });

    expect(response.statusCode).toBe(201);
    const document = response.json();
    expect(document.title).toBe('Postmortem: <incident> (<date>)');
    expect(document.contentHtml).toContain('<h2>Root cause</h2>');
    expect(document.access).toBe('owner');
  });

  it('keeps an explicit title over the template title', async () => {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { cookie },
      payload: { templateId: 'feature-spec', title: 'Dark mode spec' },
    });

    expect(response.json().title).toBe('Dark mode spec');
  });

  it('rejects an unknown template with 400', async () => {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { cookie },
      payload: { templateId: 'nope' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('Unknown template "nope".');
  });
});
