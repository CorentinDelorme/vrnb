import React from 'react'

import { getPayload } from 'payload'

import { RandosVeloPageClient } from './RandosVeloPageClient'
import config from '@/payload.config'

import './styles.css'

export default async function RandosVeloPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const randosVelo = await payload.findGlobal({
    slug: 'randos-velo',
    draft: true,
  })

  return <RandosVeloPageClient randosVelo={randosVelo} />
}
