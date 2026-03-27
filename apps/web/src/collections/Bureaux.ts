import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const Bureau: CollectionConfig = {
  slug: 'bureaux',
  access: adminOnlyWrite,
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
