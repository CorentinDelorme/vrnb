import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const adminUser = {
  email: 'admin@vrnb-test.fr',
  password: 'testadmin123',
  username: 'admin_test',
  nom: 'Admin',
  prenom: 'Test',
}

export const regularUser = {
  email: 'user@vrnb-test.fr',
  password: 'testuser123',
  username: 'user_test',
  nom: 'Regular',
  prenom: 'User',
}

/**
 * Seeds minimal data for E2E frontend tests:
 * - A "site web" referent (for admin access)
 * - An admin user with the "site web" referent
 * - A regular user without admin referent
 * - A bureau entry
 * - An activity with a lieu
 * - A category
 */
export async function seedTestData(): Promise<void> {
  const payload = await getPayload({ config })

  // Clean up existing test data
  await Promise.all([
    payload.delete({
      collection: 'users',
      where: { email: { in: [adminUser.email, regularUser.email] } },
    }),
    payload.delete({
      collection: 'referents',
      where: { nom: { equals: 'site web test' } },
    }),
  ])

  // Create "site web" referent for admin access
  let siteWebReferent
  const existingReferent = await payload.find({
    collection: 'referents',
    where: { nom: { equals: 'site web' } },
    limit: 1,
  })

  if (existingReferent.docs.length > 0) {
    siteWebReferent = existingReferent.docs[0]
  } else {
    siteWebReferent = await payload.create({
      collection: 'referents',
      data: { nom: 'site web', ordre: 999 },
      overrideAccess: true,
    })
  }

  // Create bureau
  let bureau
  const existingBureau = await payload.find({
    collection: 'bureaux',
    where: { nom: { equals: 'Président' } },
    limit: 1,
  })
  if (existingBureau.docs.length > 0) {
    bureau = existingBureau.docs[0]
  } else {
    bureau = await payload.create({
      collection: 'bureaux',
      data: { nom: 'Président', ordre: 1 },
      overrideAccess: true,
    })
  }

  // Create admin user
  await payload.create({
    collection: 'users',
    data: {
      ...adminUser,
      referents: [siteWebReferent.id],
      bureau: bureau.id,
    },
    overrideAccess: true,
  })

  // Create regular user
  await payload.create({
    collection: 'users',
    data: regularUser,
    overrideAccess: true,
  })

  // Create lieu
  let lieu
  const existingLieu = await payload.find({
    collection: 'lieux',
    where: { nom_ville: { equals: 'Bruz' } },
    limit: 1,
  })
  if (existingLieu.docs.length > 0) {
    lieu = existingLieu.docs[0]
  } else {
    lieu = await payload.create({
      collection: 'lieux',
      data: { nom_ville: 'Bruz', nom_rue: 'Place de la Mairie' },
      draft: false,
      overrideAccess: true,
    })
  }

  // Create category formation for activities
  let catFormation
  const existingCat = await payload.find({
    collection: 'categories-formations',
    where: { libelle: { equals: 'Balade du dimanche' } },
    limit: 1,
  })
  if (existingCat.docs.length > 0) {
    catFormation = existingCat.docs[0]
  } else {
    catFormation = await payload.create({
      collection: 'categories-formations',
      data: { libelle: 'Balade du dimanche' },
      draft: false,
      overrideAccess: true,
    })
  }

  // Create a future activity
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)
  await payload.create({
    collection: 'activites',
    data: {
      nom: 'Balade test E2E',
      date_activite: futureDate.toISOString(),
      lieu: lieu.id,
      distance: 25,
      duree: 120,
      categories_formation: catFormation.id,
    },
    draft: false,
    overrideAccess: true,
  })
}

/**
 * Cleans up all test data
 */
export async function cleanupTestData(): Promise<void> {
  const payload = await getPayload({ config })

  await Promise.all([
    payload.delete({
      collection: 'users',
      where: { email: { in: [adminUser.email, regularUser.email] } },
    }),
    payload.delete({
      collection: 'activites',
      where: { nom: { equals: 'Balade test E2E' } },
    }),
  ])
}
