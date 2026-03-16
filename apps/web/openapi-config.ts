import type { ConfigFile } from "@rtk-query/codegen-openapi"

const config: ConfigFile = {
  schemaFile:
    "../cms/src/extensions/documentation/documentation/1.0.0/full_documentation.json",
  apiFile: "./store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./store/strapiApi.ts",
  exportName: "strapiApi",
  hooks: true,
}

export default config
