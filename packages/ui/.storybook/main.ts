import type { StorybookConfig } from "@storybook/nextjs-vite";

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "path";

import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

function hasStoryFiles(dir: string) {
  if (!existsSync(dir)) {
    return false;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = `${dir}/${entry.name}`;

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

const configDir = dirname(fileURLToPath(import.meta.url));
const storyPatterns = [] as string[];

if (hasStoryFiles(join(configDir, "..", "stories"))) {
  storyPatterns.push(
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  );
}

if (hasStoryFiles(join(configDir, "..", "src", "components"))) {
  storyPatterns.push("../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)");
}

const config: StorybookConfig = {
  stories: storyPatterns,
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
  ],
  framework: getAbsolutePath("@storybook/nextjs-vite"),
  staticDirs: ["../public"],
};
export default config;
