import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const CategorieFormation: CollectionConfig = {
  slug: 'categories-formations',
  access: adminOnlyWrite,
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
