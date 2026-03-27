import { requireAuth } from '@/lib/requireAuth'
import { getPayloadInstance } from '@/lib/payload'

import type { Activite, CategoriesFormation, User } from '@/payload-types'

import { BaladesClient } from './BaladesClient'

export const metadata = {
  title: 'Nos Balades — VRNB',
  description: 'Retrouvez les balades passées de l\'association VRNB',
}

export default async function BaladesPage() {
  await requireAuth()
  const payload = await getPayloadInstance()

  const [activitesResult, categoriesResult, introPhotos] = await Promise.all([
    payload.find({
      collection: 'activites',
      where: {
        date_activite: { less_than: new Date().toISOString() },
      },
      sort: '-date_activite',
      depth: 2,
      limit: 500,
    }),
    payload.find({
      collection: 'categories-formations',
      limit: 100,
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.album_photo_photo_intro || null

  const activities = activitesResult.docs.map((doc) => {
    const act = doc as Activite
    const cat = act.categories_formation as CategoriesFormation | string | null
    const org = act.organisateur as User | string | null

    return {
      id: act.id,
      nom: act.nom,
      date_activite: act.date_activite,
      categorie: cat && typeof cat !== 'string' ? cat.libelle : '',
      categorieId: cat && typeof cat !== 'string' ? cat.id : typeof cat === 'string' ? cat : '',
      organisateur:
        org && typeof org !== 'string' ? `${org.prenom} ${org.nom}` : '',
      infos_activite: act.infos_activite ?? null,
    }
  })

  const categories = categoriesResult.docs.map((doc) => ({
    id: doc.id,
    libelle: (doc as CategoriesFormation).libelle,
  }))

  return (
    <BaladesClient
      activities={activities}
      categories={categories}
      heroImagePath={heroImagePath}
    />
  )
}
