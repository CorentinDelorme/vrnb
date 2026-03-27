import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent, getMediaUrl } from '@/lib/utils'

import type { Home } from '@/payload-types'

export const metadata = {
  title: 'Présentation — VRNB',
  description: "Présentation de l'association Vélo Rando Nature Bruz",
}

export default async function PresentationPage() {
  const payload = await getPayloadInstance()

  const [home, introPhotos] = await Promise.all([
    payload.findGlobal({ slug: 'home' }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const homeData = home as Home
  const heroImagePath = introPhotos.docs[0]?.presentation_photo_intro

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Présentation</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Présentation</h1>
        </section>
      )}

      <section className="container mx-auto px-4 max-w-4xl">
        {homeData.text_configurable_1 && (
          <RichTextContent content={homeData.text_configurable_1} />
        )}
      </section>

      {homeData.bloc_content && (
        <section className="container mx-auto px-4 max-w-4xl">
          {homeData.bloc_title && (
            <h2 className="text-2xl font-bold mb-4">{homeData.bloc_title}</h2>
          )}
          <RichTextContent content={homeData.bloc_content} />
        </section>
      )}

      {(homeData.pdf_statut || homeData.pdf_charte) && (
        <section className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-4">Documents</h2>
          <div className="flex flex-wrap gap-4">
            {homeData.pdf_statut && getMediaUrl(homeData.pdf_statut) && (
              <a
                href={getMediaUrl(homeData.pdf_statut)!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                {"Statut de l'association"}
              </a>
            )}
            {homeData.pdf_charte && getMediaUrl(homeData.pdf_charte) && (
              <a
                href={getMediaUrl(homeData.pdf_charte)!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                {"Charte de l'association"}
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
