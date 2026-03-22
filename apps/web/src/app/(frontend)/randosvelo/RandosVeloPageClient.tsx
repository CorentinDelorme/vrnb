'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import Image from 'next/image'
import React from 'react'

import type { RandosVelo } from '@/payload-types'

type RandosVeloPageClientProps = {
  randosVelo: RandosVelo
}

export const RandosVeloPageClient: React.FC<RandosVeloPageClientProps> = ({
  randosVelo: initialRandosVelo,
}) => {
  const { data } = useLivePreview<RandosVelo>({
    initialData: initialRandosVelo,
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
  })

  const blocks = Array.isArray(data.blocks) ? data.blocks : []

  return (
    <main className="randosVeloPage">
      <header>
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
      </header>

      <section className="randosVeloBlocks">
        {blocks.map((block) => {
          if (block.blockType !== 'rando-velo-block') {
            return null
          }

          return (
            <article className="randosVeloBlock" key={block.id || block.blockName || block.title}>
              <h2>{block.title}</h2>
              <p>{block.text}</p>
              {block.photo ? <Image alt={block.title || ''} src={block.photo} width={800} height={600} /> : null}
            </article>
          )
        })}
      </section>
    </main>
  )
}