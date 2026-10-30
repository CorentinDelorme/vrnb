import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/': new URL('./', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.spec.{ts,tsx}'],
    exclude: [
      ...configDefaults.exclude,
      'node_modules',
      'out-tsc',
      'e2e',
      'scripts/capture-manual.spec.ts',
    ],
  },
});
