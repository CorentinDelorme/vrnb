import type { CollectionConfig } from 'payload'

export const Referent: CollectionConfig = {
  slug: 'referent',
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
