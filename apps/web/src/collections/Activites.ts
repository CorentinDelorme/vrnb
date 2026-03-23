import type { CollectionConfig } from 'payload'

export const Activite: CollectionConfig = {
  slug: 'activites',
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'date_activite', 'distance', 'etat', 'categories_formation'],
  },
  fields: [
    {
      name: 'etat',
      type: 'relationship',
      relationTo: 'etats',
    },
    {
      name: 'lieu',
      type: 'relationship',
      relationTo: 'lieux',
    },
    {
      name: 'organisateur',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'nom',
      type: 'text',
      required: true,
    },
    {
      name: 'date_activite',
      type: 'date',
      required: true,
    },
    {
      name: 'duree',
      type: 'number',
    },
    {
      name: 'distance',
      type: 'number',
    },
    {
      name: 'infos_activite',
      type: 'textarea',
    },
    {
      name: 'denivele',
      type: 'number',
    },
    {
      name: 'difficulte',
      type: 'number',
    },
    {
      name: 'categories_formation',
      type: 'relationship',
      relationTo: 'categories-formations',
      required: true,
    },
    {
      name: 'url_album_photo',
      type: 'text',
    },
    {
      name: 'url_album_photo_deux',
      type: 'text',
    },
    {
      name: 'pdf',
      type: 'text',
    },
    {
      name: 'pdf_modification',
      type: 'text',
    },
    {
      name: 'total_participant',
      type: 'number',
    },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
  ],
}
