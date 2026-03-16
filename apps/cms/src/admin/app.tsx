import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [
      'fr',
    ],
       theme: {
      light: {
        colors: {
          primary600: '#b5ea86',
          secondary600: '#198754',
        },
      },
      dark: {
        colors: {
          primary600: '#b5ea86',
          secondary600: '#198754',
        },
      },
    },
  },
  bootstrap(app: StrapiApp) {
    console.log(app);
  },
};
