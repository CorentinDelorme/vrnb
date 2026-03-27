import type { Block } from 'payload'

export const CarouselBlock: Block = {
  slug: 'carousel-block',
  labels: {
    singular: 'Bloc Carousel',
    plural: 'Blocs Carousel',
  },
  fields: [
    {
      name: 'titre',
      type: 'text',
      admin: {
        description: 'Titre optionnel au-dessus du carousel',
      },
    },
    {
      name: 'images',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
  ],
}
