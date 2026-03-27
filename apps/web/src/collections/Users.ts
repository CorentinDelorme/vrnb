import type { CollectionConfig } from 'payload'
import { canAccessAdmin } from '../access/canAccessAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: canAccessAdmin,
  },
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
      relationTo: 'bureaux',
    },
    {
      name: 'referents',
      type: 'relationship',
      relationTo: 'referents',
      hasMany: true,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: "Photo de profil de l'adhérent",
      },
    },
  ],
}
