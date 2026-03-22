import type { CollectionConfig } from 'payload'

export const Referents: CollectionConfig = {
  slug: 'referents',
  admin: {
    useAsTitle: 'referent',
    defaultColumns: ['ordre', 'referent', 'updatedAt'],
  },
  defaultSort: 'ordre',
  fields: [
    {
      name: 'ordre',
      type: 'number',
      required: true,
    },
    {
      name: 'referent',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Site web',
          value: 'site-web',
        },
        {
          label: 'Logistique',
          value: 'logistique',
        },
        {
          label: 'Photo-Vidéo',
          value: 'photo-video',
        },
        {
          label: 'Mécanique',
          value: 'mecanique',
        },
        {
          label: 'Navigation GPS',
          value: 'navigation-gps',
        },
        {
          label: 'Sécurité',
          value: 'securite',
        },
        {
          label: 'Secourisme',
          value: 'secourisme',
        },
        {
          label: 'Stagiaire',
          value: 'stagiaire',
        },
        {
          label: 'Veille documentaire',
          value: 'veille-documentaire',
        },
        {
          label: 'Festivités',
          value: 'festivites',
        },
        {
          label: 'Guide conférencier',
          value: 'guide-conferencier',
        },
        {
          label: 'Balade du mardi',
          value: 'balade-du-mardi',
        },
        {
          label: 'Equipement',
          value: 'equipement',
        },
        {
          label: 'Maniabilité',
          value: 'maniabilite',
        },
      ],
    },
  ],
}
