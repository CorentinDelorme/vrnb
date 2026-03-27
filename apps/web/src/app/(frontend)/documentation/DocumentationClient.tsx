'use client'

import { useState, useMemo } from 'react'
import { RichTextContent } from '@/lib/utils'

interface DocRow {
  id: string
  titre: string
  auteur: string
  date_creation: string
  categorie: string
  categorieId: string
  intro: unknown
  paragraphe1: unknown
  paragraphe2: unknown
  image: string | null
  image2: string | null
  url: string | null
  pdf: string | null
  image_legende: string | null
  image_legende2: string | null
}

interface DocumentationClientProps {
  documents: DocRow[]
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

export function DocumentationClient({
  documents,
  categories,
  heroImagePath,
}: DocumentationClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(d.categorieId)) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          d.titre.toLowerCase().includes(q) ||
          d.auteur.toLowerCase().includes(q) ||
          d.categorie.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [documents, selectedCategories, searchQuery])

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
            <h1 className="text-4xl font-bold">Documentation</h1>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Documentation</h1>
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

          {/* Documents list */}
          <div className="flex-1">
            <p className="text-sm text-base-content/60 mb-4">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
            </p>

            <div className="grid gap-4">
              {filteredDocs.length === 0 ? (
                <p className="text-base-content/60 text-center py-8">
                  Aucun document trouvé.
                </p>
              ) : (
                filteredDocs.map((doc) => (
                  <div key={doc.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{doc.titre}</h3>
                          <p className="text-sm text-base-content/60">
                            par {doc.auteur} — {formatDate(doc.date_creation)}
                          </p>
                          {doc.categorie && (
                            <span className="badge badge-sm mt-1">{doc.categorie}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setExpandedDoc(expandedDoc === doc.id ? null : doc.id)
                          }
                        >
                          {expandedDoc === doc.id ? 'Réduire' : 'Voir plus'}
                        </button>
                      </div>

                      {/* Intro text always visible */}
                      {doc.intro ? (
                        <div className="mt-2">
                          <RichTextContent content={doc.intro} />
                        </div>
                      ) : null}

                      {/* Expanded detail view */}
                      {expandedDoc === doc.id && (
                        <div className="mt-4 border-t border-base-300 pt-4 space-y-4">
                          {doc.paragraphe1 ? (
                            <RichTextContent content={doc.paragraphe1} />
                          ) : null}

                          {doc.image && (
                            <figure>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={doc.image}
                                alt={doc.image_legende || doc.titre}
                                className="rounded-lg max-h-80 object-cover"
                              />
                              {doc.image_legende && (
                                <figcaption className="text-sm text-base-content/60 mt-1">
                                  {doc.image_legende}
                                </figcaption>
                              )}
                            </figure>
                          )}

                          {doc.paragraphe2 ? (
                            <RichTextContent content={doc.paragraphe2} />
                          ) : null}

                          {doc.image2 && (
                            <figure>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={doc.image2}
                                alt={doc.image_legende2 || doc.titre}
                                className="rounded-lg max-h-80 object-cover"
                              />
                              {doc.image_legende2 && (
                                <figcaption className="text-sm text-base-content/60 mt-1">
                                  {doc.image_legende2}
                                </figcaption>
                              )}
                            </figure>
                          )}

                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm"
                            >
                              Lien externe
                            </a>
                          )}

                          {doc.pdf && (
                            <a
                              href={doc.pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm ml-2"
                            >
                              Télécharger le PDF
                            </a>
                          )}
                        </div>
                      )}
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
