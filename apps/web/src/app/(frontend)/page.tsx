import { getPayload } from 'payload'
import React from 'react'

import { HomePageClient } from './HomePageClient'
import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const [home, partenaires] = await Promise.all([
    payload.findGlobal({
      slug: 'home',
      draft: true,
    }),
    payload.find({
      collection: 'partenaires',
      depth: 1,
      sort: 'ordre',
      limit: 100,
    }),
  ])

  return <HomePageClient home={home} partenaires={partenaires.docs} />
}
