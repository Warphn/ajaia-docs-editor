import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Database } from './client.js';
import { documents, documentShares, users } from './schema.js';

/** Shared password for every demo account. Documented in the README and on the login page. */
export const DEMO_PASSWORD = 'demo1234';

export const DEMO_USERS = [
  { email: 'alice@ajaia.dev', name: 'Alice Martins' },
  { email: 'bob@ajaia.dev', name: 'Bob Chen' },
  { email: 'carol@ajaia.dev', name: 'Carol Silva' },
] as const;

const WELCOME_DOCUMENT_HTML = `
<h1>Welcome to Ajaia Docs</h1>
<p>This document is owned by <strong>Alice</strong> and shared with <strong>Bob</strong> as an <em>editor</em>.</p>
<h2>Try it out</h2>
<ul>
  <li>Format text with <strong>bold</strong>, <em>italic</em> and <u>underline</u>.</li>
  <li>Use headings and lists to structure your notes.</li>
  <li>Open the <strong>Share</strong> dialog to grant access to a teammate.</li>
</ul>
<ol>
  <li>Sign in as Bob in another browser.</li>
  <li>Find this document under <em>Shared with me</em>.</li>
</ol>
`.trim();

/**
 * Creates the demo accounts that do not exist yet. Safe to run on every startup.
 * The welcome document is only created together with Alice, so it is never duplicated.
 */
export async function seedDemoData(db: Database): Promise<void> {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const userIdsByEmail = new Map<string, string>();
  let aliceWasCreated = false;

  for (const demoUser of DEMO_USERS) {
    const [existingUser] = await db.select().from(users).where(eq(users.email, demoUser.email));
    if (existingUser) {
      userIdsByEmail.set(demoUser.email, existingUser.id);
      continue;
    }

    const [createdUser] = await db
      .insert(users)
      .values({ ...demoUser, passwordHash })
      .returning({ id: users.id });
    userIdsByEmail.set(demoUser.email, createdUser!.id);
    if (demoUser.email === 'alice@ajaia.dev') {
      aliceWasCreated = true;
    }
  }

  if (!aliceWasCreated) {
    return;
  }

  const [welcomeDocument] = await db
    .insert(documents)
    .values({
      ownerId: userIdsByEmail.get('alice@ajaia.dev')!,
      title: 'Welcome to Ajaia Docs',
      contentHtml: WELCOME_DOCUMENT_HTML,
    })
    .returning({ id: documents.id });

  await db.insert(documentShares).values({
    documentId: welcomeDocument!.id,
    userId: userIdsByEmail.get('bob@ajaia.dev')!,
    role: 'editor',
  });
}
