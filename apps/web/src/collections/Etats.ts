import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const Etat: CollectionConfig = {
  slug: 'etats',
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
