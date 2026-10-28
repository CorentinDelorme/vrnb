import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration dédiée à la capture des screenshots du mode d'emploi.
 *
 * - testDir: './scripts' (le spec capture-manual.spec.ts n'est PAS dans e2e/
 *   pour ne pas être exécuté par `bun run e2e`)
 * - Un seul projet : Chromium
 * - Pas de webServer : le script shell lance lui-même le serveur Next.js
 *   en mode production.
 */
export default defineConfig({
  testDir: './scripts',
  /* Ne capturer que le spec Playwright du manuel (évite les .spec.ts Vitest
     des autres scripts présents dans ./scripts) */
  testMatch: ['capture-manual.spec.ts'],
  /* Un seul test à la fois pour la capture */
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
