import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, type Database } from '../src/db/client.js';
import { seedDemoData } from '../src/db/seed.js';

export interface TestContext {
  app: FastifyInstance;
  db: Database;
  close: () => Promise<void>;
}

/**
 * Builds the real app on top of a seeded database: a fresh in-memory Postgres (PGlite) by default,
 * or a real Postgres server when TEST_DATABASE_URL is set (validates the production driver).
 */
export async function createTestApp(): Promise<TestContext> {
  const connection = await connectDatabase({
    databaseUrl: process.env.TEST_DATABASE_URL,
    pgliteDataDir: undefined,
  });
  await seedDemoData(connection.db);
  const app = await buildApp({ db: connection.db, jwtSecret: 'test-secret', isProduction: false });
  await app.ready();

  return {
    app,
    db: connection.db,
    close: async () => {
      await app.close();
      await connection.close();
    },
  };
}
