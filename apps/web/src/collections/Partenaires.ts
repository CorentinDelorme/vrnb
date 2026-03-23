import type { CollectionConfig } from 'payload'

export const Partenaire: CollectionConfig = {
  slug: 'partenaires',
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['ordre', 'nom', 'url', 'updatedAt'],
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
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
