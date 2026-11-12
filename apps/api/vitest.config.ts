import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    // PGlite boots a WASM Postgres per integration suite; give it room on slow machines.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
