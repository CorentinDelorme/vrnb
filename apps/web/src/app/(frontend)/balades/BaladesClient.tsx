'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

interface PastActivity {
  id: string
  nom: string
  date_activite: string
  categorie: string
  categorieId: string
  organisateur: string
  infos_activite: string | null
}

interface BaladesClientProps {
  activities: PastActivity[]
  categories: { id: string; libelle: string }[]
  heroImagePath: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function BaladesClient({
  activities,
  categories,
  heroImagePath,
}: BaladesClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(a.categorieId)) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          a.nom.toLowerCase().includes(q) ||
          a.organisateur.toLowerCase().includes(q) ||
          a.categorie.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [activities, selectedCategories, searchQuery])

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      {heroImagePath ? (
        <section
          className="hero min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImagePath})` }}
        >
          <div className="hero-overlay bg-opacity-40" />
          <div className="hero-content text-center text-white">
            <h1 className="text-4xl font-bold">Nos Balades</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Nos Balades</h1>
        </section>
      )}

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="card bg-base-200 shadow-sm sticky top-20">
              <div className="card-body">
                <h2 className="card-title text-lg">Filtrer</h2>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
                <div className="mt-4 space-y-2">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={selectedCategories.has(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span className="text-sm">{cat.libelle}</span>
                    </label>
                  ))}
                </div>
                {selectedCategories.size > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs mt-2"
                    onClick={() => setSelectedCategories(new Set())}
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Activities cards */}
          <div className="flex-1">
            <p className="text-sm text-base-content/60 mb-4">
              {filteredActivities.length} balade{filteredActivities.length !== 1 ? 's' : ''} passée
              {filteredActivities.length !== 1 ? 's' : ''}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredActivities.length === 0 ? (
                <p className="text-base-content/60 col-span-2 text-center py-8">
                  Aucune balade trouvée.
                </p>
              ) : (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body">
                      <h3 className="card-title text-lg">{activity.nom}</h3>
                      <p className="text-sm text-base-content/60">
                        {formatDate(activity.date_activite)}
                      </p>
                      {activity.organisateur && (
                        <p className="text-sm text-base-content/70">
                          par {activity.organisateur}
                        </p>
                      )}
                      <span className="badge badge-sm">{activity.categorie}</span>
                      {activity.infos_activite && (
                        <p className="text-sm text-base-content/80 line-clamp-2 mt-1">
                          {activity.infos_activite}
                        </p>
                      )}
                      <div className="card-actions justify-end mt-2">
                        <Link
                          href={`/activites/detail/${activity.id}`}
                          className="btn btn-primary btn-xs"
                        >
                          Détails
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
