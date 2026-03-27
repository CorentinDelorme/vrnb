// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Disable no-html-link-for-pages in test and story files (UI library, not a Next.js app)
  {
    files: [
      "**/*.test.tsx",
      "**/*.test.ts",
      "**/*.stories.tsx",
      "**/*.stories.ts",
    ],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  ...storybook.configs["flat/recommended"],
]);

export default eslintConfig;
