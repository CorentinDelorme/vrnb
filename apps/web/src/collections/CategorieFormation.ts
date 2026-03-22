import type { CollectionConfig } from 'payload'

export const CategorieFormation: CollectionConfig = {
  slug: 'categorie-formation',
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
