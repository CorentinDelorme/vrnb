import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'nom', 'prenom', 'telephone', 'bureau'],
  },
  auth: true,
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'nom',
      type: 'text',
      required: true,
    },
    {
      name: 'prenom',
      type: 'text',
      required: true,
    },
    {
      name: 'telephone',
      type: 'text',
    },
    {
      name: 'date_naissance',
      type: 'date',
    },
    {
      name: 'bureau',
      type: 'relationship',
      relationTo: 'bureau',
    },
    {
      name: 'referents',
      type: 'relationship',
      relationTo: 'referent',
      hasMany: true,
    },
  ],
}
