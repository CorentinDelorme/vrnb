import { defineConfig } from 'vitest/config';

/**
 * Node-side test suite: Vercel functions (`api/`), shared server code
 * (`server/`) and the extraction scripts (`scripts/`).
 *
 * Angular component/service tests stay on the `@angular/build:unit-test`
 * runner (`ng test`); this config only covers plain TypeScript running on the
 * Node runtime, like the Vercel functions do.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.spec.ts', 'scripts/**/*.spec.ts'],
  },
});
