import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/requireAuth'
import { getPayloadInstance } from '@/lib/payload'

import type { Bureau, Referent, User } from '@/payload-types'

import { ProfileForm } from './ProfileForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const currentUser = await requireAuth()
  const { id } = await params
  const payload = await getPayloadInstance()

  let user: User
  try {
    user = await payload.findByID({
      collection: 'users',
      id,
      depth: 1,
    })
  } catch {
    notFound()
  }

  if (!user) notFound()

  const isOwnProfile = currentUser.id === user.id
  const bureau =
    user.bureau && typeof user.bureau !== 'string' ? (user.bureau as Bureau) : null
  const referents = Array.isArray(user.referents)
    ? user.referents
        .filter((r): r is Referent => typeof r !== 'string')
        .map((r) => r.nom)
    : []

  const photoUrl =
    user.photo && typeof user.photo !== 'string' ? user.photo.url : null

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="container mx-auto px-4">
        <h1 className="text-3xl font-bold">
          {isOwnProfile ? 'Mon profil' : 'Profil'}
        </h1>
      </section>

      <section className="container mx-auto px-4 max-w-3xl">
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            {/* Avatar and name */}
            <div className="flex items-center gap-4 mb-4">
              <div className="avatar placeholder">
                <div
                  className={`rounded-full w-16 ${
                    photoUrl ? '' : 'bg-primary text-primary-content'
                  }`}
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={`${user.prenom} ${user.nom}`} />
                  ) : (
                    <span className="text-xl">
                      {user.prenom?.[0]}
                      {user.nom?.[0]}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {user.prenom} <span className="uppercase">{user.nom}</span>
                </h2>
                {bureau && (
                  <span className="badge badge-primary badge-sm">{bureau.nom}</span>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className="text-sm text-base-content/60">Pseudo</span>
                <p className="font-medium">{user.username}</p>
              </div>
              <div>
                <span className="text-sm text-base-content/60">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-base-content/60">Téléphone</span>
                <p className="font-medium">{user.telephone || '—'}</p>
              </div>
              <div>
                <span className="text-sm text-base-content/60">Date de naissance</span>
                <p className="font-medium">
                  {user.date_naissance
                    ? new Date(user.date_naissance).toLocaleDateString('fr-FR')
                    : '—'}
                </p>
              </div>
              {bureau && (
                <div>
                  <span className="text-sm text-base-content/60">Bureau</span>
                  <p className="font-medium">{bureau.nom}</p>
                </div>
              )}
              {referents.length > 0 && (
                <div>
                  <span className="text-sm text-base-content/60">Référent(s)</span>
                  <p className="font-medium">{referents.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Edit form for own profile */}
            <div className="mt-6">
              <ProfileForm
                userId={user.id}
                isOwnProfile={isOwnProfile}
                initialData={{
                  username: user.username,
                  nom: user.nom,
                  prenom: user.prenom,
                  telephone: user.telephone || '',
                  date_naissance: user.date_naissance
                    ? new Date(user.date_naissance).toISOString().split('T')[0]!
                    : '',
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
