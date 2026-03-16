import type { ConfigFile } from "@rtk-query/codegen-openapi"

const config: ConfigFile = {
  schemaFile: "../cms/docs/api-spec.json",
  apiFile: "./store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./store/strapiApi.ts",
  exportName: "strapiApi",
  hooks: true,
  filterEndpoints(_operationName, operationDefinition) {
    const operationId = operationDefinition.operation.operationId || ""

    if (
      !operationId ||
      operationId.startsWith("content-type-builder") ||
      operationId.startsWith("email") ||
      operationId.startsWith("upload") ||
      operationId.startsWith("i18n") ||
      operationId.startsWith("users-permissions")
    ) {
      console.log("Skipping operation:", operationId)
      return false
    }
    console.log("Including operation:", operationId)
    return true
  },
}

export default config
