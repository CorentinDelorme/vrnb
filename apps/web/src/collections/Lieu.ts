import type { CollectionConfig } from 'payload'

export const Lieu: CollectionConfig = {
  slug: 'lieu',
  admin: {
    useAsTitle: 'nom_ville',
    defaultColumns: ['nom_ville', 'nom_rue', 'cp_ville'],
  },
  fields: [
    {
      name: 'nom_ville',
      type: 'text',
      required: true,
    },
    {
      name: 'cp_ville',
      type: 'text',
    },
    {
      name: 'num_rue',
      type: 'text',
    },
    {
      name: 'nom_rue',
      type: 'text',
      required: true,
    },
  ],
}
