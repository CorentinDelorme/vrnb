import type { CollectionConfig } from 'payload'

export const Actualite: CollectionConfig = {
  slug: 'actualites',
  admin: {
    useAsTitle: 'actu',
    defaultColumns: ['actu', 'date_actu', 'affiche_actu'],
  },
  fields: [
    {
      name: 'actu',
      type: 'text',
      required: true,
    },
    {
      name: 'date_actu',
      type: 'date',
      required: true,
    },
    {
      name: 'affiche_actu',
      type: 'checkbox',
    },
    {
      name: 'url',
      type: 'textarea',
    },
  ],
}
