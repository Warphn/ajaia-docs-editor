import { getTableColumns } from 'drizzle-orm';
import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Excalidraw scene stored as-is; validated at the API boundary (canvas module). */
export interface CanvasSceneRecord {
  elements: Record<string, unknown>[];
  files: Record<string, Record<string, unknown>>;
  pagePosition: { x: number; y: number };
}

export const shareRoleEnum = pgEnum('share_role', ['viewer', 'editor']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: createdAt(),
});

/** A project group: its members can see and edit every document created in it. */
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    // "My teams" is looked up by user.
    index('team_members_user_id_idx').on(table.userId),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Null for personal documents. Deleting a team keeps its documents with their owners.
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    contentHtml: text('content_html').notNull().default(''),
    // Incremented on every write; clients send the version they edited to detect concurrent overwrites.
    version: integer('version').notNull().default(1),
    // Whiteboard around the page (drawings + page position). Never part of the printed document.
    canvasScene: jsonb('canvas_scene').$type<CanvasSceneRecord>(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('documents_owner_id_idx').on(table.ownerId),
    index('documents_team_id_idx').on(table.teamId),
  ],
);

export const documentShares = pgTable(
  'document_shares',
  {
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: shareRoleEnum('role').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.userId] }),
    // "Shared with me" lists are looked up by recipient.
    index('document_shares_user_id_idx').on(table.userId),
  ],
);

// The canvas scene can be megabytes of JSON; document queries select every column except it.
const { canvasScene: _canvasScene, ...documentColumnsWithoutCanvas } = getTableColumns(documents);
export const documentColumns = documentColumnsWithoutCanvas;

export type User = typeof users.$inferSelect;
export type DocumentRecord = Omit<typeof documents.$inferSelect, 'canvasScene'>;
export type ShareRole = (typeof shareRoleEnum.enumValues)[number];
