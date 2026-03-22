import type { Block } from 'payload'

export const RandoVeloBlock: Block = {
  slug: 'rando-velo-block',
  interfaceName: 'RandoVeloBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'photo',
      type: 'text',
    },
  ],
}
