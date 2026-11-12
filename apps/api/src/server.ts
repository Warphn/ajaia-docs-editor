import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp, SWAGGER_UI_PATH } from './app.js';
import { loadConfig } from './config.js';
import { connectDatabase } from './db/client.js';
import { seedDemoData } from './db/seed.js';

// The web app build output, served by the API in production (single deployable unit).
const WEB_DIST_DIR = fileURLToPath(new URL('../../web/dist', import.meta.url));

async function start() {
  const config = loadConfig();
  const { db, close } = await connectDatabase({
    databaseUrl: config.databaseUrl,
    pgliteDataDir: config.pgliteDataDir,
  });

  if (config.seedDemoData) {
    await seedDemoData(db);
  }

  const app = await buildApp({
    db,
    jwtSecret: config.jwtSecret,
    isProduction: config.isProduction,
    webDistDir: existsSync(WEB_DIST_DIR) ? WEB_DIST_DIR : undefined,
    logger: true,
  });

  app.addHook('onClose', close);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Swagger UI available at http://localhost:${config.port}${SWAGGER_UI_PATH}`);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.close().finally(() => process.exit(0));
    });
  }
}

start().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
