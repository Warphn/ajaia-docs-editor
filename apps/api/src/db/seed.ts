import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Database } from './client.js';
import { documents, documentShares, teamMembers, teams, users } from './schema.js';

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

  await seedDemoTeams(db, userIdsByEmail);

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

/** Alice works on two projects with different people: the demo for team workspaces. */
const DEMO_TEAMS = [
  {
    name: 'Mobile app',
    memberEmails: ['alice@ajaia.dev', 'bob@ajaia.dev'],
    document: {
      ownerEmail: 'bob@ajaia.dev',
      title: 'Mobile app — release checklist',
      contentHtml:
        '<h1>Release checklist</h1><p>Shared with everyone in the <strong>Mobile app</strong> team.</p>' +
        '<ul><li>Freeze the release branch</li><li>Run the smoke tests</li><li>Update the store notes</li></ul>',
    },
  },
  {
    name: 'Platform',
    memberEmails: ['alice@ajaia.dev', 'carol@ajaia.dev'],
    document: {
      ownerEmail: 'carol@ajaia.dev',
      title: 'Platform — on-call handbook',
      contentHtml:
        '<h1>On-call handbook</h1><p>Shared with everyone in the <strong>Platform</strong> team.</p>' +
        '<ol><li>Acknowledge the alert</li><li>Check the dashboards</li><li>Write the incident note</li></ol>',
    },
  },
];

/** Creates the demo teams once: only when no team exists yet, so it also runs on an existing database. */
async function seedDemoTeams(db: Database, userIdsByEmail: Map<string, string>): Promise<void> {
  const [anyTeam] = await db.select({ id: teams.id }).from(teams).limit(1);
  if (anyTeam) {
    return;
  }

  for (const demoTeam of DEMO_TEAMS) {
    const creatorId = userIdsByEmail.get(demoTeam.memberEmails[0]!)!;
    const [team] = await db.insert(teams).values({ name: demoTeam.name, createdBy: creatorId }).returning({ id: teams.id });
    await db
      .insert(teamMembers)
      .values(demoTeam.memberEmails.map((email) => ({ teamId: team!.id, userId: userIdsByEmail.get(email)! })));
    await db.insert(documents).values({
      ownerId: userIdsByEmail.get(demoTeam.document.ownerEmail)!,
      teamId: team!.id,
      title: demoTeam.document.title,
      contentHtml: demoTeam.document.contentHtml,
    });
  }
}
