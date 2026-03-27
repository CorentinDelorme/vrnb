import { getPayloadInstance } from '@/lib/payload'

import type { Bureau, User } from '@/payload-types'

export const metadata = {
  title: 'Organisation — VRNB',
  description: 'Organisation et bureau de l\'association VRNB',
}

export default async function OrganisationPage() {
  const payload = await getPayloadInstance()

  const [bureaux, introPhotos] = await Promise.all([
    payload.find({
      collection: 'bureaux',
      sort: 'ordre',
      limit: 100,
      depth: 0,
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.organisation_photo_intro

  // Fetch users who have a bureau role assigned
  const users = await payload.find({
    collection: 'users',
    where: {
      bureau: { exists: true },
    },
    depth: 1,
    limit: 200,
  })

  // Map bureau ID → list of users
  const bureauMembers = new Map<string, User[]>()
  for (const user of users.docs) {
    const u = user as User
    const bureauId =
      typeof u.bureau === 'string' ? u.bureau : u.bureau?.id
    if (bureauId) {
      const list = bureauMembers.get(bureauId) ?? []
      list.push(u)
      bureauMembers.set(bureauId, list)
    }
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* Hero */}
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Organisation</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Organisation</h1>
        </section>
      )}

      {/* Bureau list */}
      <section className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Le Bureau</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {bureaux.docs.map((bureau) => {
            const b = bureau as Bureau
            const members = bureauMembers.get(b.id) ?? []
            return (
              <div key={b.id} className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title">{b.nom}</h3>
                  {members.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {members.map((member) => (
                        <li key={member.id} className="text-base-content/80">
                          {member.prenom} <span className="uppercase">{member.nom}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base-content/50 text-sm italic">
                      Aucun membre assigné
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {bureaux.docs.length === 0 && (
          <p className="text-base-content/60">Aucun poste de bureau configuré.</p>
        )}
      </section>
    </div>
  )
}
