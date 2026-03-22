import type { CollectionConfig } from 'payload'

export const EtiquetteContent: CollectionConfig = {
  slug: 'etiquette-content',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['first_etiquette_text', 'second_etiquette_text'],
  },
  fields: [
    {
      name: 'first_etiquette_text',
      type: 'text',
    },
    {
      name: 'first_etiquette_photo',
      type: 'text',
    },
    {
      name: 'second_etiquette_text',
      type: 'text',
    },
    {
      name: 'second_etiquette_photo',
      type: 'text',
    },
    {
      name: 'third_etiquette_text',
      type: 'text',
    },
    {
      name: 'third_etiquette_photo',
      type: 'text',
    },
    {
      name: 'fourth_etiquette_text',
      type: 'text',
    },
    {
      name: 'fourth_etiquette_photo',
      type: 'text',
    },
    {
      name: 'first_etiquette_overlay',
      type: 'text',
    },
    {
      name: 'second_etiquette_overlay',
      type: 'text',
    },
    {
      name: 'third_etiquette_overlay',
      type: 'text',
    },
    {
      name: 'fourth_etiquette_overlay',
      type: 'text',
    },
  ],
}
