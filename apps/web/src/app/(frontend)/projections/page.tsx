import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent } from '@/lib/utils'

import type { ActivitesContent } from '@/payload-types'

export const metadata = {
  title: 'Projections de films — VRNB',
  description: 'Projections de films documentaires organisées par VRNB',
}

export default async function ProjectionsPage() {
  const payload = await getPayloadInstance()

  const [contentResult, introPhotos] = await Promise.all([
    payload.find({ collection: 'activites-content', limit: 1 }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const content = contentResult.docs[0] as ActivitesContent | undefined
  const heroImagePath = introPhotos.docs[0]?.projection_film_photo_intro

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Projections de films</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Projections de films</h1>
        </section>
      )}

      {content?.projectionfilm_text_intro && (
        <section className="container mx-auto px-4 max-w-4xl">
          <RichTextContent content={content.projectionfilm_text_intro} />
        </section>
      )}

      {(content?.projection_film_title || content?.projection_film_text) && (
        <section className="container mx-auto px-4 max-w-5xl">
          <div className="card bg-base-200 shadow-md">
            {content.projection_film_photo && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.projection_film_photo}
                  alt={content.projection_film_title || 'Projections de films'}
                  className="w-full h-48 object-cover"
                />
              </figure>
            )}
            <div className="card-body">
              {content.projection_film_title && (
                <h2 className="card-title">{content.projection_film_title}</h2>
              )}
              {content.projection_film_text && (
                <RichTextContent content={content.projection_film_text} />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
