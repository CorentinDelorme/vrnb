import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.spec.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'node_modules', 'out-tsc', 'e2e'],
  },
});
