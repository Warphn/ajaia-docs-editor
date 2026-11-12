import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, type Database } from '../src/db/client.js';
import { seedDemoData } from '../src/db/seed.js';

export interface TestContext {
  app: FastifyInstance;
  db: Database;
  close: () => Promise<void>;
}

/** Builds the real app on top of a fresh, seeded, in-memory Postgres (PGlite). */
export async function createTestApp(): Promise<TestContext> {
  const connection = await connectDatabase({ databaseUrl: undefined, pgliteDataDir: undefined });
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
