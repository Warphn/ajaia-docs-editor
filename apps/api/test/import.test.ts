import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../src/db/seed.js';
import { SESSION_COOKIE_NAME } from '../src/lib/authentication.js';
import { MAX_IMPORT_FILE_BYTES } from '../src/modules/imports/file-to-html.js';
import { createTestApp, type TestContext } from './test-app.js';

const BOUNDARY = '----AjaiaTestBoundary';

function multipartFile(fileName: string, content: Buffer) {
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      'Content-Type: application/octet-stream\r\n\r\n',
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return {
    payload: Buffer.concat([head, content, tail]),
    headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
  };
}

describe('POST /api/documents/import', () => {
  let context: TestContext;
  let cookie: string;

  beforeAll(async () => {
    context = await createTestApp();
    const login = await context.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'carol@ajaia.dev', password: DEMO_PASSWORD },
    });
    cookie = `${SESSION_COOKIE_NAME}=${login.cookies[0]!.value}`;
  });

  afterAll(async () => {
    await context.close();
  });

  function importFile(fileName: string, content: Buffer) {
    const { payload, headers } = multipartFile(fileName, content);
    return context.app.inject({
      method: 'POST',
      url: '/api/documents/import',
      payload,
      headers: { ...headers, cookie },
    });
  }

  it('creates a new owned document from a Markdown file', async () => {
    const response = await importFile('Sprint Retro.md', Buffer.from('# Retro\n\n- **Keep** pairing'));

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ title: 'Sprint Retro', access: 'owner' });
    expect(response.json().contentHtml).toMatch(/<h1>Retro<\/h1>\s*<ul>\s*<li><strong>Keep<\/strong> pairing<\/li>\s*<\/ul>/);

    const list = (await context.app.inject({ method: 'GET', url: '/api/documents', headers: { cookie } })).json();
    expect(list.owned.map((document: { title: string }) => document.title)).toContain('Sprint Retro');
  });

  it('sanitizes raw HTML embedded in Markdown', async () => {
    const response = await importFile('evil.md', Buffer.from('Hi <script>alert(1)</script>'));

    expect(response.json().contentHtml).toBe('<p>Hi </p>');
  });

  it('rejects unsupported file types with 415', async () => {
    const response = await importFile('deck.pdf', Buffer.from('%PDF-1.7'));

    expect(response.statusCode).toBe(415);
    expect(response.json().message).toContain('.txt, .md, .docx');
  });

  it('rejects files over the size limit with 413', async () => {
    const response = await importFile('huge.txt', Buffer.alloc(MAX_IMPORT_FILE_BYTES + 1, 'a'));

    expect(response.statusCode).toBe(413);
    expect(response.json().error).toBe('FILE_TOO_LARGE');
  });

  it('requires authentication', async () => {
    const { payload, headers } = multipartFile('notes.txt', Buffer.from('hello'));
    const response = await context.app.inject({ method: 'POST', url: '/api/documents/import', payload, headers });

    expect(response.statusCode).toBe(401);
  });
});
