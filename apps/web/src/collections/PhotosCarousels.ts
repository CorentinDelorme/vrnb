import type { CollectionConfig } from 'payload'

export const PhotoCarousel: CollectionConfig = {
  slug: 'photos-carousels',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['image1', 'image2', 'image3'],
  },
  fields: [
    {
      name: 'image1',
      type: 'text',
    },
    {
      name: 'image2',
      type: 'text',
    },
    {
      name: 'image3',
      type: 'text',
    },
    {
      name: 'image4',
      type: 'text',
    },
    {
      name: 'image5',
      type: 'text',
    },
    {
      name: 'image6',
      type: 'text',
    },
    {
      name: 'image7',
      type: 'text',
    },
  ],
}
