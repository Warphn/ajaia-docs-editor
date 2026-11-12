import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../src/db/seed.js';
import { SESSION_COOKIE_NAME } from '../src/lib/authentication.js';
import { MAX_CANVAS_BODY_BYTES } from '../src/modules/canvas/canvas.schemas.js';
import { createTestApp, type TestContext } from './test-app.js';

const RECTANGLE = { id: 'shape-1', type: 'rectangle', x: -300, y: 40, width: 120, height: 80 };
const SCENE = { elements: [RECTANGLE], files: {}, pagePosition: { x: 40, y: 0 } };

describe('document canvas', () => {
  let context: TestContext;
  const cookies: Record<string, string> = {};
  let documentId: string;

  async function signIn(email: string) {
    const response = await context.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: DEMO_PASSWORD },
    });
    return `${SESSION_COOKIE_NAME}=${response.cookies[0]!.value}`;
  }

  function canvasRequest(cookie: string, method: 'GET' | 'PUT', payload?: object | string) {
    return context.app.inject({
      method,
      url: `/api/documents/${documentId}/canvas`,
      headers: { cookie, 'content-type': 'application/json' },
      ...(payload !== undefined && { payload }),
    });
  }

  beforeAll(async () => {
    context = await createTestApp();
    cookies.alice = await signIn('alice@ajaia.dev');
    cookies.bob = await signIn('bob@ajaia.dev');
    cookies.carol = await signIn('carol@ajaia.dev');

    const created = await context.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { cookie: cookies.alice },
      payload: { title: 'Canvas doc' },
    });
    documentId = created.json().id;
    await context.app.inject({
      method: 'POST',
      url: `/api/documents/${documentId}/shares`,
      headers: { cookie: cookies.alice },
      payload: { email: 'bob@ajaia.dev', role: 'viewer' },
    });
  });

  afterAll(async () => {
    await context.close();
  });

  it('returns null before anything is drawn', async () => {
    const response = await canvasRequest(cookies.alice!, 'GET');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ scene: null });
  });

  it('saves the scene for the owner and returns it on the next load', async () => {
    const saveResponse = await canvasRequest(cookies.alice!, 'PUT', SCENE);
    expect(saveResponse.statusCode).toBe(200);

    const loadResponse = await canvasRequest(cookies.alice!, 'GET');
    expect(loadResponse.json().scene).toEqual(SCENE);
  });

  it('lets a viewer see the canvas but not change it', async () => {
    expect((await canvasRequest(cookies.bob!, 'GET')).json().scene).toEqual(SCENE);

    const saveResponse = await canvasRequest(cookies.bob!, 'PUT', { ...SCENE, elements: [] });
    expect(saveResponse.statusCode).toBe(403);
  });

  it('hides the canvas from users without access to the document', async () => {
    expect((await canvasRequest(cookies.carol!, 'GET')).statusCode).toBe(404);
    expect((await canvasRequest(cookies.carol!, 'PUT', SCENE)).statusCode).toBe(404);
  });

  it('rejects a scene without a page position with 400', async () => {
    const response = await canvasRequest(cookies.alice!, 'PUT', { elements: [] });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('VALIDATION_ERROR');
  });

  it('rejects scenes over the size limit with 413', async () => {
    const hugeText = 'x'.repeat(MAX_CANVAS_BODY_BYTES);
    const response = await canvasRequest(cookies.alice!, 'PUT', {
      ...SCENE,
      elements: [{ ...RECTANGLE, type: 'text', text: hugeText }],
    });

    expect(response.statusCode).toBe(413);
  });

  it('does not include the canvas in the document payload used by autosave', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: `/api/documents/${documentId}`,
      headers: { cookie: cookies.alice! },
    });

    expect(response.json()).not.toHaveProperty('canvasScene');
  });
});
