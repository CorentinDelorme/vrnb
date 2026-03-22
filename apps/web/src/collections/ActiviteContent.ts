import type { CollectionConfig } from 'payload'

export const ActiviteContent: CollectionConfig = {
  slug: 'activite-content',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['balade_title', 'escapade_title'],
  },
  fields: [
    {
      name: 'balade_text',
      type: 'richText',
    },
    {
      name: 'escapade_text',
      type: 'richText',
    },
    {
      name: 'mecanique_text',
      type: 'richText',
    },
    {
      name: 'securite_text',
      type: 'richText',
    },
    {
      name: 'secourisme_text',
      type: 'richText',
    },
    {
      name: 'photo_video_text',
      type: 'richText',
    },
    {
      name: 'projection_film_text',
      type: 'richText',
    },
    {
      name: 'autre_text',
      type: 'richText',
    },
    {
      name: 'ecocitoyennete_text',
      type: 'richText',
    },
    {
      name: 'balade_photo',
      type: 'text',
    },
    {
      name: 'escapade_photo',
      type: 'text',
    },
    {
      name: 'mecanique_photo',
      type: 'text',
    },
    {
      name: 'securite_photo',
      type: 'text',
    },
    {
      name: 'secourisme_photo',
      type: 'text',
    },
    {
      name: 'photo_video_photo',
      type: 'text',
    },
    {
      name: 'projection_film_photo',
      type: 'text',
    },
    {
      name: 'ecocitoyennete_photo',
      type: 'text',
    },
    {
      name: 'autre_photo',
      type: 'text',
    },
    {
      name: 'formation_text_intro',
      type: 'richText',
    },
    {
      name: 'randovelo_text_intro',
      type: 'richText',
    },
    {
      name: 'projectionfilm_text_intro',
      type: 'richText',
    },
    {
      name: 'ecocitoyennete_text_intro',
      type: 'richText',
    },
    {
      name: 'autres_text_intro',
      type: 'richText',
    },
    {
      name: 'balade_title',
      type: 'text',
    },
    {
      name: 'escapade_title',
      type: 'text',
    },
    {
      name: 'mecanique_title',
      type: 'text',
    },
    {
      name: 'securite_title',
      type: 'text',
    },
    {
      name: 'secourisme_title',
      type: 'text',
    },
    {
      name: 'photo_video_title',
      type: 'text',
    },
    {
      name: 'projection_film_title',
      type: 'text',
    },
    {
      name: 'autre_title',
      type: 'text',
    },
    {
      name: 'ecocitoyennete_title',
      type: 'text',
    },
  ],
}
