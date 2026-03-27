import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const PhotoAlbum: CollectionConfig = {
  slug: 'photos-albums',
  access: adminOnlyWrite,
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
