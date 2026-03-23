import type { CollectionConfig } from 'payload'

export const Bureau: CollectionConfig = {
  slug: 'bureaux',
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['ordre', 'nom', 'updatedAt'],
  },
  defaultSort: 'ordre',
  fields: [
    {
      name: 'ordre',
      type: 'number',
      required: true,
    },
    {
      name: 'nom',
      type: 'text',
      required: true,
    },
  ],
}
