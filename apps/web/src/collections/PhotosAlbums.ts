import type { CollectionConfig } from 'payload'

export const PhotoAlbum: CollectionConfig = {
  slug: 'photos-albums',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['activite', 'image', 'url'],
  },
  fields: [
    {
      name: 'activite',
      type: 'relationship',
      relationTo: 'activites',
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
