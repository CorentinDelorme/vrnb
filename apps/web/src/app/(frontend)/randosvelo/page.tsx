import React from 'react'

import { getPayload } from 'payload'

import config from '@/payload.config'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'

import './styles.css'

export default async function RandosVeloPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const randosVelo = await payload.findGlobal({
    slug: 'randos-velo',
    draft: true,
  })

  const blocks = Array.isArray(randosVelo.blocks) ? randosVelo.blocks : []

  return (
    <main className="randosVeloPage">
      <RefreshRouteOnSave />
      <header>
        <h1>{randosVelo.title}</h1>
        <p>{randosVelo.subtitle}</p>
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
              {block.photo ? <img alt={block.title} src={block.photo} /> : null}
            </article>
          )
        })}
      </section>
    </main>
  )
}
