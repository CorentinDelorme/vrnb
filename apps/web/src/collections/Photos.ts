import type { CollectionConfig } from 'payload'

export const Photo: CollectionConfig = {
  slug: 'photos',
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
