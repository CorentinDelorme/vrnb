'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

interface ActivityRow {
  id: string
  nom: string
  date_activite: string
  categorie: string
  categorieId: string
  ville: string
}

interface ProgrammeClientProps {
  activities: ActivityRow[]
  categories: { id: string; libelle: string }[]
  heroImagePath: string | null
}

/** Format a date for display */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ProgrammeClient({
  activities,
  categories,
  heroImagePath,
}: ProgrammeClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      // Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(a.categorieId)) {
        return false
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          a.nom.toLowerCase().includes(q) ||
          a.ville.toLowerCase().includes(q) ||
          a.categorie.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [activities, selectedCategories, searchQuery])

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
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
            <h1 className="text-4xl font-bold">Programme</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Programme</h1>
        </section>
      )}

      {/* Content with sidebar */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar — CategoryFilter */}
          <aside className="lg:w-72 shrink-0">
            <div className="card bg-base-200 shadow-sm sticky top-20">
              <div className="card-body">
                <h2 className="card-title text-lg">Filtrer</h2>

                {/* Search input */}
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered input-sm w-full"
                />

                {/* Category checkboxes */}
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

          {/* Activities table */}
          <div className="flex-1 overflow-x-auto">
            <p className="text-sm text-base-content/60 mb-4">
              {filteredActivities.length} activité{filteredActivities.length !== 1 ? 's' : ''} à
              venir
            </p>

            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Ville</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-base-content/60 py-8">
                      Aucune activité trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="whitespace-nowrap">{formatDate(activity.date_activite)}</td>
                      <td>{activity.nom}</td>
                      <td>
                        <span className="badge badge-sm">{activity.categorie}</span>
                      </td>
                      <td>{activity.ville}</td>
                      <td>
                        <Link
                          href={`/activites/detail/${activity.id}`}
                          className="btn btn-primary btn-xs"
                        >
                          Détails
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
