import type { CollectionConfig } from 'payload'

export const PhotoAlbum: CollectionConfig = {
  slug: 'photo-album',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['activite', 'image', 'url'],
  },
  fields: [
    {
      name: 'activite',
      type: 'relationship',
      relationTo: 'activite',
    },
    {
      name: 'image',
      type: 'text',
    },
    {
      name: 'url',
      type: 'textarea',
    },
  ],
}
