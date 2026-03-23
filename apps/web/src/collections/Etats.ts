import type { CollectionConfig } from 'payload'

export const Etat: CollectionConfig = {
  slug: 'etats',
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
