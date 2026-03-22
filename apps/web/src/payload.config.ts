import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { BureauRoles } from './collections/BureauRoles'
import { Referents } from './collections/Referents'
import { Partenaires } from './collections/Partenaires'
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
  collections: [Users, Media, BureauRoles, Referents, Partenaires],
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
