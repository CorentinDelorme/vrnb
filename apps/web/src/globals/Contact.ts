import type { GlobalConfig } from 'payload'

export const Contact: GlobalConfig = {
  slug: 'contact',
  fields: [
    {
      name: 'titre',
      type: 'text',
      required: true,
      defaultValue: 'Nous contacter',
    },
    {
      name: 'texte_intro',
      type: 'richText',
      admin: {
        description: "Texte d'introduction affiché au-dessus du formulaire",
      },
    },
  ],
}
