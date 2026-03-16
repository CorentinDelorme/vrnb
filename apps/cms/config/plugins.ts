import type { Core } from "@strapi/strapi"

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  documentation: {
    config: {
      // https://docs.strapi.io/cms/plugins/documentation#define-which-plugins
      "x-strapi-config": {
        plugins: [],
      },
    },
  },
})

export default config
