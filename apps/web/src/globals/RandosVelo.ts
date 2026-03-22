import type { GlobalConfig } from 'payload'

import { RandoVeloBlock } from '../blocks/RandoVeloBlock'

export const RandosVelo: GlobalConfig = {
  slug: 'randos-velo',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Randonnées à vélo',
    },
    {
      name: 'subtitle',
      type: 'text',
      required: true,
      defaultValue: 'Vous pouvez visualiser ci-dessous les différentes randonnées à vélo',
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [RandoVeloBlock],
      required: true,
    },
  ],
}
