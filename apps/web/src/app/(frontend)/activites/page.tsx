import { getPayloadInstance } from '@/lib/payload'

import type { Activite, CategoriesFormation, Lieux } from '@/payload-types'

import { ProgrammeClient } from './ProgrammeClient'

export const metadata = {
  title: 'Programme — VRNB',
  description: 'Programme des activités à venir',
}

export default async function ProgrammePage() {
  const payload = await getPayloadInstance()

  const [activitesResult, categoriesResult, introPhotos] = await Promise.all([
    payload.find({
      collection: 'activites',
      where: {
        date_activite: { greater_than_equal: new Date().toISOString() },
      },
      sort: 'date_activite',
      depth: 2,
      limit: 500,
    }),
    payload.find({
      collection: 'categories-formations',
      limit: 100,
    }),
    payload.find({ collection: 'intro-photos', limit: 1 }),
  ])

  const heroImagePath = introPhotos.docs[0]?.programme_photo_intro || null

  // Map activities to lightweight rows for the client component
  const activities = activitesResult.docs.map((doc) => {
    const act = doc as Activite
    const cat = act.categories_formation as CategoriesFormation | string | null
    const lieu = act.lieu as Lieux | string | null

    return {
      id: act.id,
      nom: act.nom,
      date_activite: act.date_activite,
      categorie: cat && typeof cat !== 'string' ? cat.libelle : '',
      categorieId: cat && typeof cat !== 'string' ? cat.id : typeof cat === 'string' ? cat : '',
      ville: lieu && typeof lieu !== 'string' ? lieu.nom_ville : '',
    }
  })

  const categories = categoriesResult.docs.map((doc) => ({
    id: doc.id,
    libelle: (doc as CategoriesFormation).libelle,
  }))

  return (
    <ProgrammeClient
      activities={activities}
      categories={categories}
      heroImagePath={heroImagePath}
    />
  )
}
