import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Bureau } from './collections/Bureaux'
import { Referent } from './collections/Referents'
import { Partenaire } from './collections/Partenaires'
import { Etat } from './collections/Etats'
import { Categorie } from './collections/Categories'
import { CategorieFormation } from './collections/CategoriesFormations'
import { Lieu } from './collections/Lieux'
import { Actualite } from './collections/Actualites'
import { Commentaire } from './collections/Commentaires'
import { DocPdf } from './collections/DocsPdf'
import { ActiviteContent } from './collections/ActivitesContent'
import { Activite } from './collections/Activites'
import { Photo } from './collections/Photos'
import { PhotoAlbum } from './collections/PhotosAlbums'
import { PhotoCarousel } from './collections/PhotosCarousels'
import { EtiquetteContent } from './collections/EtiquettesContent'
import { IntroPhoto } from './collections/IntroPhotos'
import { Documentation } from './collections/Documentations'
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
