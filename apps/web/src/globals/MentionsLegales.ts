import type { GlobalConfig } from 'payload'

export const MentionsLegales: GlobalConfig = {
  slug: 'mentions-legales',
  fields: [
    {
      name: 'titre',
      type: 'text',
      required: true,
      defaultValue: 'Mentions légales',
    },
    {
      name: 'paragraphes',
      type: 'array',
      admin: {
        description: 'Paragraphes des mentions légales',
      },
      fields: [
        {
          name: 'titre',
          type: 'text',
        },
        {
          name: 'contenu',
          type: 'richText',
          required: true,
        },
      ],
    },
  ],
}
