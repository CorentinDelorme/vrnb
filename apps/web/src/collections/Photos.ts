import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const Photo: CollectionConfig = {
  slug: 'photos',
  access: adminOnlyWrite,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'adhherent'],
  },
  fields: [
    {
      name: 'adhherent',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
