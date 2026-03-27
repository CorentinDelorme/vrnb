import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent } from '@/lib/utils'

import type { ActivitesContent } from '@/payload-types'

export const metadata = {
  title: 'Éco citoyenneté — VRNB',
  description: 'Activités éco citoyennes organisées par VRNB',
}

export default async function EcocitoyennetePage() {
  const payload = await getPayloadInstance()

  const [contentResult, introPhotos] = await Promise.all([
    payload.find({ collection: 'activites-content', limit: 1 }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const content = contentResult.docs[0] as ActivitesContent | undefined
  const heroImagePath = introPhotos.docs[0]?.ecocitoyennete_photo_intro

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Éco citoyenneté</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Éco citoyenneté</h1>
        </section>
      )}

      {content?.ecocitoyennete_text_intro && (
        <section className="container mx-auto px-4 max-w-4xl">
          <RichTextContent content={content.ecocitoyennete_text_intro} />
        </section>
      )}

      {(content?.ecocitoyennete_title || content?.ecocitoyennete_text) && (
        <section className="container mx-auto px-4 max-w-5xl">
          <div className="card bg-base-200 shadow-md">
            {content.ecocitoyennete_photo && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.ecocitoyennete_photo}
                  alt={content.ecocitoyennete_title || 'Éco citoyenneté'}
                  className="w-full h-48 object-cover"
                />
              </figure>
            )}
            <div className="card-body">
              {content.ecocitoyennete_title && (
                <h2 className="card-title">{content.ecocitoyennete_title}</h2>
              )}
              {content.ecocitoyennete_text && (
                <RichTextContent content={content.ecocitoyennete_text} />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
