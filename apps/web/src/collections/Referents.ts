import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const Referent: CollectionConfig = {
  slug: 'referents',
  access: adminOnlyWrite,
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['ordre', 'nom', 'updatedAt'],
  },
  defaultSort: 'ordre',
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        const doc = await req.payload.findByID({
          collection: 'referents',
          id,
          overrideAccess: true,
        })
        if (doc.nom?.trim().toLowerCase() === 'site web') {
          throw new Error(
            'Le référent "site web" ne peut pas être supprimé car il est requis pour l\'accès admin.',
          )
        }
      },
    ],
  },
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
