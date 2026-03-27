import type { CollectionConfig } from 'payload'

import { adminOnlyWrite } from '@/access/adminOnlyWrite'

export const Documentation: CollectionConfig = {
  slug: 'documentations',
  access: adminOnlyWrite,
  admin: {
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'auteur', 'date_creation', 'categorie'],
  },
  fields: [
    {
      name: 'date_creation',
      type: 'date',
      required: true,
    },
    {
      name: 'auteur',
      type: 'text',
      required: true,
    },
    {
      name: 'titre',
      type: 'text',
      required: true,
    },
    {
      name: 'paragraphe1',
      type: 'richText',
    },
    {
      name: 'paragraphe2',
      type: 'richText',
    },
    {
      name: 'image',
      type: 'text',
    },
    {
      name: 'url',
      type: 'textarea',
    },
    {
      name: 'intro',
      type: 'richText',
      required: true,
    },
    {
      name: 'image2',
      type: 'text',
    },
    {
      name: 'date_modifier',
      type: 'date',
    },
    {
      name: 'image_modification',
      type: 'text',
    },
    {
      name: 'image_legende',
      type: 'text',
    },
    {
      name: 'image_modification2',
      type: 'text',
    },
    {
      name: 'image_legende2',
      type: 'text',
    },
    {
      name: 'categorie',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'pdf',
      type: 'text',
    },
    {
      name: 'pdf_modification',
      type: 'text',
    },
  ],
}
