import type { Block } from 'payload'

export const RichTextBlock: Block = {
  slug: 'rich-text-block',
  labels: {
    singular: 'Bloc Texte Riche',
    plural: 'Blocs Texte Riche',
  },
  fields: [
    {
      name: 'titre',
      type: 'text',
      admin: {
        description: 'Titre optionnel au-dessus du contenu',
      },
    },
    {
      name: 'contenu',
      type: 'richText',
      required: true,
    },
  ],
}
