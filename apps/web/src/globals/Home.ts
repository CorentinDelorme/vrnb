import type { GlobalConfig } from 'payload'

import { PartenairesList } from '@/blocks/PartenairesList'

export const Home: GlobalConfig = {
  slug: 'home',
  fields: [
    {
      name: 'layout',
      type: 'blocks',
      blocks: [PartenairesList],
      required: true,
      defaultValue: [
        {
          blockType: 'partenaires-list',
          title: 'Nos partenaires',
        },
      ],
    },
  ],
}
