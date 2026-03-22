import type { Block } from 'payload'

export const PartenairesList: Block = {
  slug: 'partenaires-list',
  interfaceName: 'PartenairesListBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Nos partenaires',
    },
  ],
}
