import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPayloadInstance } from '@/lib/payload'
import { formatDate, formatTime } from '@/lib/utils'

import type { Activite, CategoriesFormation, Lieux, User } from '@/payload-types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params
  const payload = await getPayloadInstance()

  let activity: Activite
  try {
    activity = await payload.findByID({
      collection: 'activites',
      id,
      depth: 2,
    })
  } catch {
    notFound()
  }

  if (!activity) notFound()

  const lieu = activity.lieu as Lieux | string | null
  const organisateur = activity.organisateur as User | string | null
  const categorie = activity.categories_formation as CategoriesFormation | string | null

  const lieuData = lieu && typeof lieu !== 'string' ? lieu : null
  const orgData = organisateur && typeof organisateur !== 'string' ? organisateur : null
  const catData = categorie && typeof categorie !== 'string' ? categorie : null

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4">
        <h1 className="text-3xl font-bold">Détails de l&apos;activité</h1>
      </section>

      <section className="container mx-auto px-4 max-w-4xl">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            {/* Header info */}
            <div className="flex flex-wrap gap-4 items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{activity.nom}</h2>
                <p className="text-base-content/70 mt-1">
                  {formatDate(activity.date_activite)} — {formatTime(activity.date_activite)}
                </p>
                {lieuData && (
                  <p className="text-base-content/70">{lieuData.nom_ville}</p>
                )}
              </div>
              {catData && (
                <span className="badge badge-primary badge-lg">{catData.libelle}</span>
              )}
            </div>

            <div className="divider" />

            {/* Organizer card */}
            {orgData && (
              <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-12">
                    <span className="text-lg">
                      {orgData.prenom?.[0]}
                      {orgData.nom?.[0]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">
                    Organisateur :{' '}
                    <Link
                      href={`/user/${orgData.id}`}
                      className="link link-primary"
                    >
                      {orgData.prenom} <span className="uppercase">{orgData.nom}</span>
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Activity details grid */}
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              {activity.duree != null && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Durée :</span>
                  <span>{activity.duree} min</span>
                </div>
              )}
              {activity.distance != null && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Distance :</span>
                  <span>{activity.distance} km</span>
                </div>
              )}
              {activity.denivele != null && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Dénivelé :</span>
                  <span>{activity.denivele} m</span>
                </div>
              )}
              {activity.difficulte != null && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Difficulté :</span>
                  <span>{activity.difficulte}/5</span>
                </div>
              )}
            </div>

            {/* Meeting point */}
            {lieuData && (
              <div className="mt-4">
                <h3 className="font-semibold mb-1">Point de rendez-vous</h3>
                <p className="text-base-content/80">
                  {lieuData.num_rue && `${lieuData.num_rue} `}
                  {lieuData.nom_rue}
                  {lieuData.cp_ville && `, ${lieuData.cp_ville}`} {lieuData.nom_ville}
                </p>
              </div>
            )}

            {/* Infos */}
            {activity.infos_activite && (
              <div className="mt-4">
                <h3 className="font-semibold mb-1">Informations</h3>
                <p className="whitespace-pre-wrap text-base-content/80">
                  {activity.infos_activite}
                </p>
              </div>
            )}

            {/* PDF links */}
            {activity.pdf && (
              <div className="mt-4">
                <a
                  href={activity.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Télécharger le PDF
                </a>
              </div>
            )}

            {/* Participants count */}
            {activity.total_participant != null && (
              <div className="mt-4 text-sm text-base-content/60">
                {activity.total_participant} participant
                {activity.total_participant !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link href="/activites" className="btn btn-ghost">
            ← Retour au programme
          </Link>
        </div>
      </section>
    </div>
  )
}
