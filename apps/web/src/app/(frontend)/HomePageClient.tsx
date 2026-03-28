'use client'

import Image from 'next/image'
import { useLivePreview } from '@payloadcms/live-preview-react'
import React from 'react'

import type { Home, Media, Partenaire } from '@/payload-types'

type HomePageClientProps = {
  home: Home
  partenaires: Partenaire[]
}

export const HomePageClient: React.FC<HomePageClientProps> = ({ home: initialHome, partenaires }) => {
  const { data } = useLivePreview<Home>({
    initialData: initialHome,
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
  })

  const layout =
    Array.isArray(data.layout) && data.layout.length > 0
      ? data.layout
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
    <main className="min-h-screen px-11 py-11 max-w-[960px] mx-auto">
      {layout.map((block) => {
        if (block.blockType !== 'partenaires-list') {
          return null
        }

        return (
          <section className="w-full" key={block.id || block.blockName || 'partenaires-list'}>
            <h1 className="mb-6">{block.title}</h1>
            {partenaires.length === 0 && <p>Aucun partenaire pour le moment.</p>}
            {partenaires.length > 0 && (
              <ul className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {partenaires.map((partenaire) => {
                  const logo = getLogoFromPartenaire(partenaire.logo)

                  return (
                    <li key={partenaire.id} className="border border-current rounded-lg">
                      <a href={partenaire.url} rel="noopener noreferrer" target="_blank" className="no-underline flex items-center gap-3 p-4">
                        {logo && (
                          <Image
                            alt={logo.alt}
                            className="w-20 h-20 object-contain max-[400px]:w-14 max-[400px]:h-14"
                            height={80}
                            src={logo.url}
                            width={80}
                          />
                        )}
                        <span className="font-semibold leading-tight">{partenaire.nom}</span>
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