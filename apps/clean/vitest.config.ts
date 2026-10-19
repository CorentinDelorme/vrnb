import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Standalone Vitest config for the Next.js app (spec #3, seam 2).
 * Legacy Angular TestBed specs (`src/`) and Playwright specs (`e2e/`) are excluded.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['**/*.spec.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'src/**', 'e2e/**'],
  },
});
