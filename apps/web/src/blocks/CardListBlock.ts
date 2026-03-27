import type { Block } from 'payload'

export const CardListBlock: Block = {
  slug: 'card-list-block',
  labels: {
    singular: 'Bloc Liste de Cartes',
    plural: 'Blocs Liste de Cartes',
  },
  fields: [
    {
      name: 'titre',
      type: 'text',
      admin: {
        description: 'Titre optionnel de la section',
      },
    },
    {
      name: 'cards',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'titre',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'richText',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'lien',
          type: 'text',
          admin: {
            description: 'URL ou chemin interne du lien',
          },
        },
      ],
    },
  ],
}
