import type { CollectionConfig } from 'payload'

export const Categorie: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'libelle',
    defaultColumns: ['libelle'],
  },
  fields: [
    {
      name: 'libelle',
      type: 'text',
      required: true,
    },
  ],
}
