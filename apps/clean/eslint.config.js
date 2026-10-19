import { nextJsConfig } from '@repo/eslint-config/next-js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      // Static local images (VRNB logo, manual screenshots) intentionally use a
      // plain <img> so the DOM stays identical to the legacy Angular markup (spec #3).
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: ['.angular/**', 'out-tsc/**', 'test-results/**', 'playwright-report/**'],
  },
];
