import type { Block } from 'payload'

export const HeroImageBlock: Block = {
  slug: 'hero-image-block',
  labels: {
    singular: 'Bloc Image Hero',
    plural: 'Blocs Image Hero',
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'titre',
      type: 'text',
      admin: {
        description: "Titre superposé sur l'image",
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Description optionnelle sous le titre',
      },
    },
  ],
}
