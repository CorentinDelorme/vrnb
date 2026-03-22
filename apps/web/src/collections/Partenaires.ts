import type { CollectionConfig } from 'payload'

export const Partenaires: CollectionConfig = {
  slug: 'partenaires',
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['ordre', 'nom', 'lien', 'updatedAt'],
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
      name: 'lien',
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
