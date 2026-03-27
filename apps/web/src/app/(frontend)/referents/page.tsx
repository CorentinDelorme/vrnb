import { getPayloadInstance } from '@/lib/payload'

import type { Referent, User } from '@/payload-types'

export const metadata = {
  title: 'Référents — VRNB',
  description: 'Les référents de l\'association VRNB',
}

export default async function ReferentsPage() {
  const payload = await getPayloadInstance()

  const [referents, introPhotos] = await Promise.all([
    payload.find({
      collection: 'referents',
      sort: 'ordre',
      limit: 100,
      depth: 0,
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.trombi_photo_intro

  // Fetch all users with their referents populated
  const users = await payload.find({
    collection: 'users',
    where: {
      referents: { exists: true },
    },
    depth: 1,
    limit: 500,
  })

  // Map referent ID → list of users
  const referentMembers = new Map<string, User[]>()
  for (const user of users.docs) {
    const u = user as User
    if (Array.isArray(u.referents)) {
      for (const ref of u.referents) {
        const refId = typeof ref === 'string' ? ref : ref.id
        const list = referentMembers.get(refId) ?? []
        list.push(u)
        referentMembers.set(refId, list)
      }
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
            <h1 className="text-4xl font-bold">Référents</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Référents</h1>
        </section>
      )}

      {/* Referents list */}
      <section className="container mx-auto px-4 max-w-4xl">
        <div className="grid gap-4 md:grid-cols-2">
          {referents.docs.map((referent) => {
            const r = referent as Referent
            const members = referentMembers.get(r.id) ?? []
            return (
              <div key={r.id} className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title">{r.nom}</h3>
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
                      Aucun membre référent
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {referents.docs.length === 0 && (
          <p className="text-base-content/60">Aucun référent configuré.</p>
        )}
      </section>
    </div>
  )
}
