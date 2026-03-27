import { getPayloadInstance } from '@/lib/payload'
import { RichTextContent } from '@/lib/utils'

import type { ActivitesContent } from '@/payload-types'

export const metadata = {
  title: 'Formations — VRNB',
  description: 'Nos formations : mécanique, sécurité, secourisme et plus',
}

export default async function FormationsPage() {
  const payload = await getPayloadInstance()

  const [contentResult, introPhotos] = await Promise.all([
    payload.find({ collection: 'activites-content', limit: 1 }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const content = contentResult.docs[0] as ActivitesContent | undefined
  const heroImagePath = introPhotos.docs[0]?.formation_photo_intro

  const sections = [
    {
      title: content?.mecanique_title || 'Mécanique',
      text: content?.mecanique_text,
      photo: content?.mecanique_photo,
    },
    {
      title: content?.securite_title || 'Sécurité',
      text: content?.securite_text,
      photo: content?.securite_photo,
    },
    {
      title: content?.secourisme_title || 'Secourisme',
      text: content?.secourisme_text,
      photo: content?.secourisme_photo,
    },
    {
      title: content?.photo_video_title || 'Photo / Vidéo',
      text: content?.photo_video_text,
      photo: content?.photo_video_photo,
    },
  ]

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Formations</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Formations</h1>
        </section>
      )}

      {content?.formation_text_intro && (
        <section className="container mx-auto px-4 max-w-4xl">
          <RichTextContent content={content.formation_text_intro} />
        </section>
      )}

      <section className="container mx-auto px-4 max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <div key={index} className="card bg-base-200 shadow-md">
              {section.photo && (
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={section.photo}
                    alt={section.title}
                    className="w-full h-48 object-cover"
                  />
                </figure>
              )}
              <div className="card-body">
                <h2 className="card-title">{section.title}</h2>
                {section.text && <RichTextContent content={section.text} />}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
