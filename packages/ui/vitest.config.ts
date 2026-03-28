import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function hasStoryFiles(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (hasStoryFiles(entryPath)) {
        return true;
      }
      continue;
    }

    if (/\.stories\.(?:js|jsx|mjs|ts|tsx|mdx)$/.test(entry.name)) {
      return true;
    }
  }

  return false;
}

const hasStories =
  hasStoryFiles(path.join(dirname, "src", "components")) ||
  hasStoryFiles(path.join(dirname, "stories"));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Unit tests for components
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          globals: true,
        },
        resolve: {
          alias: {
            "@": path.resolve(dirname),
          },
        },
      },
      // Storybook integration tests
      ...(hasStories
        ? [
            {
              extends: true,
              plugins: [
                // The plugin will run tests for the stories defined in your Storybook config
                // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                storybookTest({ configDir: path.join(dirname, ".storybook") }),
              ],
              test: {
                name: "storybook",
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [{ browser: "chromium" }],
                },
              },
            },
          ]
        : []),
    ],
  },
});
