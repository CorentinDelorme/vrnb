import type { CollectionConfig } from 'payload'

export const IntroPhoto: CollectionConfig = {
  slug: 'intro-photo',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['presentation_photo_intro', 'organisation_photo_intro'],
  },
  fields: [
    {
      name: 'presentation_photo_intro',
      type: 'text',
    },
    {
      name: 'organisation_photo_intro',
      type: 'text',
    },
    {
      name: 'rando_velo_photo_intro',
      type: 'text',
    },
    {
      name: 'formation_photo_intro',
      type: 'text',
    },
    {
      name: 'projection_film_photo_intro',
      type: 'text',
    },
    {
      name: 'ecocitoyennete_photo_intro',
      type: 'text',
    },
    {
      name: 'autre_photo_intro',
      type: 'text',
    },
    {
      name: 'programme_photo_intro',
      type: 'text',
    },
    {
      name: 'album_photo_photo_intro',
      type: 'text',
    },
    {
      name: 'trombi_photo_intro',
      type: 'text',
    },
    {
      name: 'profil_photo_intro',
      type: 'text',
    },
    {
      name: 'documentation_photo_intro',
      type: 'text',
    },
  ],
}
