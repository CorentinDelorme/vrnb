import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media } from '@/payload-types'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
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

  const layout =
    Array.isArray(home.layout) && home.layout.length > 0
      ? home.layout
      : [
          {
            blockType: 'partenaires-list' as const,
            title: 'Nos partenaires',
          },
        ]

  const getLogoFromPartenaire = (logo: string | Media | null | undefined) => {
    if (!logo || typeof logo === 'string') {
      return null
    }

    return logo.url
      ? {
          url: logo.url,
          alt: logo.alt || 'Logo partenaire',
        }
      : null
  }

  return (
    <main className="home">
      <RefreshRouteOnSave />
      {layout.map((block) => {
        if (block.blockType !== 'partenaires-list') {
          return null
        }

        return (
          <section className="partenaires" key={block.id || block.blockName || 'partenaires-list'}>
            <h1>{block.title}</h1>
            {partenaires.docs.length === 0 && <p>Aucun partenaire pour le moment.</p>}
            {partenaires.docs.length > 0 && (
              <ul className="partenairesList">
                {partenaires.docs.map((partenaire) => {
                  const logo = getLogoFromPartenaire(partenaire.logo)

                  return (
                    <li key={partenaire.id}>
                      <a href={partenaire.lien} rel="noopener noreferrer" target="_blank">
                        {logo && (
                          <Image
                            alt={logo.alt}
                            className="partenaireLogo"
                            height={80}
                            src={logo.url}
                            width={80}
                          />
                        )}
                        <span>{partenaire.nom}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </main>
  )
}
