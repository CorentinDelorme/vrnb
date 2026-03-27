import { requireAuth } from '@/lib/requireAuth'
import { getPayloadInstance } from '@/lib/payload'

import type { Bureau, User } from '@/payload-types'

export const metadata = {
  title: 'Trombinoscope — VRNB',
  description: 'Trombinoscope des adhérents VRNB',
}

export default async function TrombinoscopePage() {
  await requireAuth()
  const payload = await getPayloadInstance()

  const [usersResult, introPhotos] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 1,
      limit: 500,
      sort: 'nom',
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.trombi_photo_intro || null

  // Sort users: bureau members first (by bureau ordre), then alphabetical
  const users = usersResult.docs as User[]
  const sortedUsers = [...users].sort((a, b) => {
    const aBureau = a.bureau && typeof a.bureau !== 'string' ? (a.bureau as Bureau) : null
    const bBureau = b.bureau && typeof b.bureau !== 'string' ? (b.bureau as Bureau) : null

    // Bureau members first
    if (aBureau && !bBureau) return -1
    if (!aBureau && bBureau) return 1
    // Both have bureau — sort by ordre
    if (aBureau && bBureau) {
      return (aBureau.ordre ?? 999) - (bBureau.ordre ?? 999)
    }
    // Both no bureau — alphabetical
    return a.nom.localeCompare(b.nom)
  })

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Trombinoscope</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Trombinoscope</h1>
        </section>
      )}

      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {sortedUsers.map((user) => {
            const bureau =
              user.bureau && typeof user.bureau !== 'string'
                ? (user.bureau as Bureau)
                : null
            const photoUrl =
              user.photo && typeof user.photo !== 'string'
                ? user.photo.url
                : null

            return (
              <div key={user.id} className="card bg-base-200 shadow-sm">
                <div className="card-body items-center text-center p-4">
                  {/* Avatar */}
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

                  {/* Name */}
                  <h3 className="text-sm font-semibold mt-2">
                    {user.prenom} <span className="uppercase">{user.nom}</span>
                  </h3>

                  {/* Bureau role */}
                  {bureau && (
                    <span className="badge badge-primary badge-sm">{bureau.nom}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {sortedUsers.length === 0 && (
          <p className="text-base-content/60 text-center py-8">Aucun adhérent trouvé.</p>
        )}
      </section>
    </div>
  )
}
