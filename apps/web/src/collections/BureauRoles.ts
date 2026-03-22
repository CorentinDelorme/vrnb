import type { CollectionConfig } from 'payload'

export const BureauRoles: CollectionConfig = {
  slug: 'bureau-roles',
  admin: {
    useAsTitle: 'role',
    defaultColumns: ['ordre', 'role', 'updatedAt'],
  },
  defaultSort: 'ordre',
  fields: [
    {
      name: 'ordre',
      type: 'number',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Président',
          value: 'president',
        },
        {
          label: 'Vice-Président',
          value: 'vice-president',
        },
        {
          label: 'Référent des Référents',
          value: 'referent-des-referents',
        },
        {
          label: 'Secrétaire',
          value: 'secretaire',
        },
        {
          label: 'Vice-Secrétaire',
          value: 'vice-secretaire',
        },
        {
          label: 'Trésorier',
          value: 'tresorier',
        },
        {
          label: 'Vice-Trésorier',
          value: 'vice-tresorier',
        },
        {
          label: 'Secrétaire-Comptable',
          value: 'secretaire-comptable',
        },
        {
          label: 'Logistique',
          value: 'logistique',
        },
        {
          label: 'Adhérent',
          value: 'adherent',
        },
      ],
    },
  ],
}
