import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema.js';

/** Driver-agnostic database handle: services work the same against Postgres and PGlite. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

export interface DatabaseOptions {
  databaseUrl?: string | undefined;
  /** Ignored when databaseUrl is set. Undefined means in-memory. */
  pgliteDataDir?: string | undefined;
}

// Resolves to apps/api/drizzle both from src/db (tsx) and dist/db (compiled).
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Opens the database and applies pending migrations. */
export async function connectDatabase(options: DatabaseOptions): Promise<DatabaseConnection> {
  if (options.databaseUrl) {
    const sql = postgres(options.databaseUrl, { max: 5, onnotice: () => {} });
    const db = drizzlePostgres(sql, { schema });
    await migratePostgres(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return { db: db as unknown as Database, close: () => sql.end() };
  }

  if (options.pgliteDataDir) {
    mkdirSync(options.pgliteDataDir, { recursive: true });
  }
  const client = options.pgliteDataDir ? new PGlite(options.pgliteDataDir) : new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db: db as unknown as Database, close: () => client.close() };
}
