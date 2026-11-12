import { index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const shareRoleEnum = pgEnum('share_role', ['viewer', 'editor']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: createdAt(),
});

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    contentHtml: text('content_html').notNull().default(''),
    // Incremented on every write; clients send the version they edited to detect concurrent overwrites.
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('documents_owner_id_idx').on(table.ownerId)],
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

export type User = typeof users.$inferSelect;
export type DocumentRecord = typeof documents.$inferSelect;
export type ShareRole = (typeof shareRoleEnum.enumValues)[number];
