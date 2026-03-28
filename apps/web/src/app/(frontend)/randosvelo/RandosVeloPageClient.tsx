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
    <main className="max-w-[960px] mx-auto px-11 py-11">
      <header>
        <h1>{data.title}</h1>
        <p className="mt-0">{data.subtitle}</p>
      </header>

      <section className="grid gap-6">
        {blocks.map((block) => {
          if (block.blockType !== 'rando-velo-block') {
            return null
          }

          return (
            <article className="border border-current rounded-lg p-5" key={block.id || block.blockName || block.title}>
              <h2 className="mt-0 mb-3 text-[28px] leading-tight">{block.title}</h2>
              <p className="mt-0 whitespace-pre-line">{block.text}</p>
              {block.photo ? <Image alt={block.title || ''} src={block.photo} width={800} height={600} className="mt-3 w-full max-w-[720px] h-auto rounded-md" /> : null}
            </article>
          )
        })}
      </section>
    </main>
  )
}