import type { CollectionConfig } from 'payload'

export const Commentaire: CollectionConfig = {
  slug: 'commentaire',
  admin: {
    useAsTitle: 'user_name',
    defaultColumns: ['user_name', 'date_creation', 'documentation'],
  },
  fields: [
    {
      name: 'documentation',
      type: 'relationship',
      relationTo: 'documentation',
    },
    {
      name: 'user_name',
      type: 'text',
      required: true,
    },
    {
      name: 'date_creation',
      type: 'date',
      required: true,
    },
    {
      name: 'date_modification',
      type: 'date',
    },
    {
      name: 'commentaire',
      type: 'richText',
      required: true,
    },
  ],
}
