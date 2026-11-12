import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_DEV_SERVER = 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Excalidraw pulls a dependency whose peer range stops at React 18; if npm ever installs a second React
    // for it, hooks break ("reading 'useState' of null"). Root package.json pins React 19 so only one copy
    // is installed, and dedupe keeps the bundle on that copy.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    // Same-origin /api in development, mirroring production where the API serves the built app.
    proxy: { '/api': API_DEV_SERVER },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
