import { requireAuth } from '@/lib/requireAuth'
import { getPayloadInstance } from '@/lib/payload'

import type { Category, Documentation } from '@/payload-types'

import { DocumentationClient } from './DocumentationClient'

export const metadata = {
  title: 'Documentation — VRNB',
  description: 'Documentation et ressources de l\'association VRNB',
}

export default async function DocumentationPage() {
  await requireAuth()
  const payload = await getPayloadInstance()

  const [docsResult, categoriesResult, introPhotos] = await Promise.all([
    payload.find({
      collection: 'documentations',
      sort: '-date_creation',
      depth: 1,
      limit: 500,
    }),
    payload.find({
      collection: 'categories',
      limit: 100,
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.documentation_photo_intro || null

  const documents = docsResult.docs.map((doc) => {
    const d = doc as Documentation
    const cat = d.categorie as Category | string | null

    return {
      id: d.id,
      titre: d.titre,
      auteur: d.auteur,
      date_creation: d.date_creation,
      categorie: cat && typeof cat !== 'string' ? cat.libelle : '',
      categorieId: cat && typeof cat !== 'string' ? cat.id : typeof cat === 'string' ? cat : '',
      intro: d.intro,
      paragraphe1: d.paragraphe1,
      paragraphe2: d.paragraphe2,
      image: d.image ?? null,
      image2: d.image2 ?? null,
      url: d.url ?? null,
      pdf: d.pdf ?? null,
      image_legende: d.image_legende ?? null,
      image_legende2: d.image_legende2 ?? null,
    }
  })

  const categories = categoriesResult.docs.map((doc) => ({
    id: doc.id,
    libelle: (doc as Category).libelle,
  }))

  return (
    <DocumentationClient
      documents={documents}
      categories={categories}
      heroImagePath={heroImagePath}
    />
  )
}
