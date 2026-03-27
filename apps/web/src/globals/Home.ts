import type { GlobalConfig } from 'payload'

import { PartenairesList } from '@/blocks/PartenairesList'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { HeroImageBlock } from '@/blocks/HeroImageBlock'
import { CardListBlock } from '@/blocks/CardListBlock'
import { CarouselBlock } from '@/blocks/CarouselBlock'
import { ContactFormBlock } from '@/blocks/ContactFormBlock'

export const Home: GlobalConfig = {
  slug: 'home',
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: "Logo de l'association VRNB affiché dans le header et la page d'accueil",
      },
    },
    {
      name: 'text_configurable_1',
      type: 'richText',
      admin: {
        description: 'Texte affiché sous la grande carte des prochaines balades',
      },
    },
    {
      name: 'carousel_photos',
      type: 'array',
      admin: {
        description: 'Photos du carousel défilant en auto-scroll',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'text_configurable_2',
      type: 'richText',
      admin: {
        description: 'Texte affiché sous le carousel de photos',
      },
    },
    {
      name: 'bloc_title',
      type: 'text',
      admin: {
        description: 'Titre du bloc configurable',
      },
    },
    {
      name: 'bloc_content',
      type: 'richText',
      admin: {
        description: 'Contenu du bloc configurable',
      },
    },
    {
      name: 'text_configurable_bottom_1',
      type: 'richText',
      admin: {
        description: 'Premier texte configurable en bas de page',
      },
    },
    {
      name: 'text_configurable_bottom_2',
      type: 'richText',
      admin: {
        description: 'Deuxième texte configurable en bas de page',
      },
    },
    {
      name: 'pdf_statut',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: "PDF des statuts de l'association",
      },
    },
    {
      name: 'pdf_charte',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: "PDF de la charte de l'association",
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        PartenairesList,
        RichTextBlock,
        HeroImageBlock,
        CardListBlock,
        CarouselBlock,
        ContactFormBlock,
      ],
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
