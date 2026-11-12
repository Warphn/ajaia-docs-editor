import 'dotenv/config';

export interface AppConfig {
  port: number;
  host: string;
  /** When undefined, the embedded PGlite database is used instead of a Postgres server. */
  databaseUrl: string | undefined;
  /** PGlite storage directory; undefined means an in-memory database (used by tests). */
  pgliteDataDir: string | undefined;
  jwtSecret: string;
  isProduction: boolean;
  seedDemoData: boolean;
}

const DEVELOPMENT_JWT_SECRET = 'development-only-secret-do-not-use-in-production';

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = environment.NODE_ENV === 'production';
  const jwtSecret = environment.JWT_SECRET || DEVELOPMENT_JWT_SECRET;

  if (isProduction && jwtSecret === DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return {
    port: Number(environment.PORT ?? 3000),
    host: environment.HOST ?? '0.0.0.0',
    databaseUrl: environment.DATABASE_URL || undefined,
    pgliteDataDir: environment.PGLITE_DATA_DIR || './.data/pglite',
    jwtSecret,
    isProduction,
    seedDemoData: environment.SEED_DEMO_DATA !== 'false',
  };
}
