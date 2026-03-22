import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Bureau } from './collections/Bureau'
import { Referent } from './collections/Referent'
import { Partenaire } from './collections/Partenaire'
import { Etat } from './collections/Etat'
import { Categorie } from './collections/Categorie'
import { CategorieFormation } from './collections/CategorieFormation'
import { Lieu } from './collections/Lieu'
import { Actualite } from './collections/Actualite'
import { Commentaire } from './collections/Commentaire'
import { DocPdf } from './collections/DocPdf'
import { ActiviteContent } from './collections/ActiviteContent'
import { Activite } from './collections/Activite'
import { Photo } from './collections/Photo'
import { PhotoAlbum } from './collections/PhotoAlbum'
import { PhotoCarousel } from './collections/PhotoCarousel'
import { EtiquetteContent } from './collections/EtiquetteContent'
import { IntroPhoto } from './collections/IntroPhoto'
import { Documentation } from './collections/Documentation'
import { Home } from './globals/Home'
import { RandosVelo } from './globals/RandosVelo'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      url: ({ globalConfig }) => {
        const globalUrlMap: Record<string, string> = {
          home: '/',
          'randos-velo': '/randosvelo',
        }
        const path = globalConfig?.slug ? (globalUrlMap[globalConfig.slug] ?? '/') : '/'
        return `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}${path}`
      },
      globals: ['home', 'randos-velo'],
    },
  },
  collections: [
    Users,
    Media,
    Bureau,
    Referent,
    Partenaire,
    Etat,
    Categorie,
    CategorieFormation,
    Lieu,
    Actualite,
    Commentaire,
    DocPdf,
    ActiviteContent,
    Activite,
    Photo,
    PhotoAlbum,
    PhotoCarousel,
    EtiquetteContent,
    IntroPhoto,
    Documentation,
  ],
  globals: [Home, RandosVelo],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
})
