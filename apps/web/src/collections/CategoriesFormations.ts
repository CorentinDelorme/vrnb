import type { CollectionConfig } from 'payload'

export const CategorieFormation: CollectionConfig = {
  slug: 'categories-formations',
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
