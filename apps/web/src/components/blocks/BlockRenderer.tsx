import Image from 'next/image'
import Link from 'next/link'

import { RichTextContent, getMediaUrl, getMediaAlt } from '@/lib/utils'

import type { Media } from '@/payload-types'

/** Render a RichTextBlock */
export function RenderRichTextBlock({
  block,
}: {
  block: { titre?: string | null; contenu: unknown }
}) {
  return (
    <section className="container mx-auto px-4 max-w-4xl">
      {block.titre && <h2 className="text-2xl font-bold mb-4">{block.titre}</h2>}
      <RichTextContent content={block.contenu} />
    </section>
  )
}

/** Render a HeroImageBlock */
export function RenderHeroImageBlock({
  block,
}: {
  block: {
    image: string | Media
    titre?: string | null
    description?: unknown
  }
}) {
  const imageUrl = getMediaUrl(block.image)

  if (!imageUrl) return null

  return (
    <section
      className="hero min-h-64 bg-cover bg-center"
      style={{ backgroundImage: `url(${imageUrl})` }}
    >
      <div className="hero-overlay bg-opacity-40" />
      <div className="hero-content text-center text-white">
        <div>
          {block.titre && <h2 className="text-4xl font-bold">{block.titre}</h2>}
          {block.description ? (
            <div className="mt-4">
              <RichTextContent content={block.description} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/** Render a CardListBlock */
export function RenderCardListBlock({
  block,
}: {
  block: {
    titre?: string | null
    cards: Array<{
      id?: string
      titre: string
      description?: unknown
      image?: string | Media | null
      lien?: string | null
    }>
  }
}) {
  return (
    <section className="container mx-auto px-4 max-w-6xl">
      {block.titre && <h2 className="text-2xl font-bold mb-6">{block.titre}</h2>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {block.cards.map((card, index) => {
          const imageUrl = getMediaUrl(card.image)
          const imageAlt = getMediaAlt(card.image)

          const content = (
            <div className="card bg-base-200 shadow-md h-full">
              {imageUrl && (
                <figure>
                  <Image
                    src={imageUrl}
                    alt={imageAlt || card.titre}
                    width={400}
                    height={250}
                    className="w-full h-48 object-cover"
                  />
                </figure>
              )}
              <div className="card-body">
                <h3 className="card-title">{card.titre}</h3>
                {card.description ? <RichTextContent content={card.description} /> : null}
              </div>
            </div>
          )

          if (card.lien) {
            return (
              <Link key={card.id ?? index} href={card.lien} className="block hover:scale-[1.02] transition-transform">
                {content}
              </Link>
            )
          }

          return <div key={card.id ?? index}>{content}</div>
        })}
      </div>
    </section>
  )
}

/** Render a CarouselBlock */
export function RenderCarouselBlock({
  block,
}: {
  block: {
    titre?: string | null
    images: Array<{ id?: string; image: string | Media }>
  }
}) {
  return (
    <section className="container mx-auto px-4">
      {block.titre && <h2 className="text-2xl font-bold mb-4">{block.titre}</h2>}
      <div className="carousel w-full gap-4">
        {block.images.map((item, index) => {
          const imageUrl = getMediaUrl(item.image)
          const imageAlt = getMediaAlt(item.image)
          if (!imageUrl) return null

          return (
            <div key={item.id ?? index} className="carousel-item">
              <Image
                src={imageUrl}
                alt={imageAlt || 'Photo'}
                width={300}
                height={200}
                className="rounded-lg object-cover"
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
