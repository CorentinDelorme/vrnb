import type { GlobalConfig } from 'payload'

export const Adhesion: GlobalConfig = {
  slug: 'adhesion',
  fields: [
    {
      name: 'titre',
      type: 'text',
      required: true,
      defaultValue: 'Adhésion',
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: "Contenu de la page d'adhésion",
      },
    },
  ],
}
