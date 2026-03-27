import Image from 'next/image'
import Link from 'next/link'

import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Activite, Home, Lieux, Media } from '@/payload-types'

/** Render Payload richText content as HTML (simplified) */
function RichTextContent({ content }: { content: unknown }) {
  if (!content) return null

  // Payload lexical richText returns a serialized JSON structure
  // For now, render the root nodes' text content
  const data = content as { root?: { children?: Array<Record<string, unknown>> } }
  if (!data?.root?.children) return null

  return (
    <div className="prose max-w-none">
      {data.root.children.map((node, i) => {
        if (node.type === 'heading') {
          const text = extractText(node)
          const tag = (node.tag as string) || 'h2'
          if (tag === 'h1') return <h1 key={i}>{text}</h1>
          if (tag === 'h3') return <h3 key={i}>{text}</h3>
          if (tag === 'h4') return <h4 key={i}>{text}</h4>
          return <h2 key={i}>{text}</h2>
        }
        if (node.type === 'paragraph') {
          const text = extractText(node)
          if (!text) return null
          return <p key={i}>{text}</p>
        }
        return null
      })}
    </div>
  )
}

/** Extract text content recursively from a lexical node */
function extractText(node: Record<string, unknown>): string {
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) {
    return node.children.map((child: Record<string, unknown>) => extractText(child)).join('')
  }
  return ''
}

/** Get media URL helper */
function getMediaUrl(media: string | Media | null | undefined): string | null {
  if (!media || typeof media === 'string') return null
  return media.url ?? null
}

/** Get media alt text helper */
function getMediaAlt(media: string | Media | null | undefined): string {
  if (!media || typeof media === 'string') return ''
  return media.alt || ''
}

/** Format a date for display */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Format time from a date string */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function HomePage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const [home, upcomingActivities, activityCount] = await Promise.all([
    payload.findGlobal({ slug: 'home' }),
    payload.find({
      collection: 'activites',
      where: {
        date_activite: { greater_than_equal: new Date().toISOString() },
      },
      sort: 'date_activite',
      limit: 2,
      depth: 2,
    }),
    payload.count({
      collection: 'activites',
      where: {
        date_activite: { greater_than_equal: new Date().toISOString() },
      },
    }),
  ])

  const homeData = home as Home
  const logoUrl = getMediaUrl(homeData.logo)
  const logoAlt = getMediaAlt(homeData.logo)

  const activityPhotos = [
    { title: 'Randonnées à vélo', href: '/randosvelo' },
    { title: 'Formations', href: '/formations' },
    { title: 'Projections de films', href: '/projections' },
    { title: 'Éco citoyenneté', href: '/ecocitoyennete' },
  ]

  return (
    <div className="flex flex-col gap-12 py-8">
      {/* 1. Logo VRNB */}
      {logoUrl && (
        <section className="flex justify-center">
          <Image src={logoUrl} alt={logoAlt || 'VRNB'} width={200} height={200} priority />
        </section>
      )}

      {/* 2. Upcoming activities card */}
      <section className="container mx-auto px-4">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-2xl">Prochaines balades</h2>
            {upcomingActivities.docs.length === 0 ? (
              <p className="text-base-content/60">Aucune balade à venir pour le moment.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingActivities.docs.map((activity) => {
                  const act = activity as Activite
                  const lieu = act.lieu as Lieux | null | undefined
                  return (
                    <div key={act.id} className="card bg-base-100 shadow-sm">
                      <div className="card-body">
                        <h3 className="card-title text-lg">{act.nom}</h3>
                        <p className="text-sm text-base-content/70">
                          {formatDate(act.date_activite)}
                          {' — '}
                          {formatTime(act.date_activite)}
                        </p>
                        {lieu && typeof lieu !== 'string' && (
                          <p className="text-sm">{lieu.nom_ville}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="mb-2">
                À noter sur vos agendas :{' '}
                <span className="font-semibold">{activityCount.totalDocs}</span> événement
                {activityCount.totalDocs !== 1 ? 's' : ''} à venir
              </p>
              <Link href="/activites" className="btn btn-primary btn-sm">
                Voir le programme
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Configurable text 1 */}
      {homeData.text_configurable_1 && (
        <section className="container mx-auto px-4">
          <RichTextContent content={homeData.text_configurable_1} />
        </section>
      )}

      {/* 4. Photo carousel */}
      {homeData.carousel_photos && homeData.carousel_photos.length > 0 && (
        <section className="overflow-hidden py-4">
          <div className="flex animate-scroll gap-4 px-4">
            {[...homeData.carousel_photos, ...homeData.carousel_photos].map((photo, index) => {
              const imageUrl = getMediaUrl(photo.image)
              const imageAlt = getMediaAlt(photo.image)
              if (!imageUrl) return null
              return (
                <div key={`${photo.id}-${index}`} className="shrink-0">
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
      )}

      {/* 5. Configurable text 2 */}
      {homeData.text_configurable_2 && (
        <section className="container mx-auto px-4">
          <RichTextContent content={homeData.text_configurable_2} />
        </section>
      )}

      {/* 6. Title + content block */}
      {(homeData.bloc_title || homeData.bloc_content) && (
        <section className="container mx-auto px-4">
          {homeData.bloc_title && (
            <h2 className="text-2xl font-bold mb-4">{homeData.bloc_title}</h2>
          )}
          {homeData.bloc_content && <RichTextContent content={homeData.bloc_content} />}
        </section>
      )}

      {/* 7. Activity photos - 4 clickable images */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activityPhotos.map((photo) => (
            <Link
              key={photo.href}
              href={photo.href}
              className="group relative overflow-hidden rounded-lg aspect-square bg-base-300"
            >
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-white text-lg font-bold text-center px-2">
                  {photo.title}
                </span>
              </div>
              {/* Overlay description on hover */}
              <div className="absolute top-0 left-0 right-0 p-4 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {photo.title}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 8. Bottom configurable texts */}
      {homeData.text_configurable_bottom_1 && (
        <section className="container mx-auto px-4">
          <RichTextContent content={homeData.text_configurable_bottom_1} />
        </section>
      )}
      {homeData.text_configurable_bottom_2 && (
        <section className="container mx-auto px-4">
          <RichTextContent content={homeData.text_configurable_bottom_2} />
        </section>
      )}

      {/* 9. PDF downloads */}
      {(homeData.pdf_statut || homeData.pdf_charte) && (
        <section className="container mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {homeData.pdf_statut && getMediaUrl(homeData.pdf_statut) && (
              <a
                href={getMediaUrl(homeData.pdf_statut)!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Statut de l&apos;association
              </a>
            )}
            {homeData.pdf_charte && getMediaUrl(homeData.pdf_charte) && (
              <a
                href={getMediaUrl(homeData.pdf_charte)!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Charte de l&apos;association
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
