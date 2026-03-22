import { getPayload } from 'payload'
import config from '../src/payload.config.js'

const bureauRoles = [
  { ordre: 1, role: 'president' },
  { ordre: 1, role: 'vice-president' },
  { ordre: 1, role: 'referent-des-referents' },
  { ordre: 2, role: 'secretaire' },
  { ordre: 2, role: 'vice-secretaire' },
  { ordre: 3, role: 'tresorier' },
  { ordre: 3, role: 'vice-tresorier' },
  { ordre: 4, role: 'secretaire-comptable' },
  { ordre: 4, role: 'logistique' },
  { ordre: 99, role: 'adherent' },
] as const

const referents = [
  { ordre: 1, referent: 'site-web' },
  { ordre: 2, referent: 'logistique' },
  { ordre: 3, referent: 'photo-video' },
  { ordre: 4, referent: 'mecanique' },
  { ordre: 5, referent: 'navigation-gps' },
  { ordre: 6, referent: 'securite' },
  { ordre: 7, referent: 'secourisme' },
  { ordre: 8, referent: 'stagiaire' },
  { ordre: 9, referent: 'veille-documentaire' },
  { ordre: 10, referent: 'festivites' },
  { ordre: 11, referent: 'guide-conferencier' },
  { ordre: 12, referent: 'balade-du-mardi' },
  { ordre: 13, referent: 'equipement' },
  { ordre: 14, referent: 'maniabilite' },
] as const

async function seedOrderedCollections(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'bureau-roles',
    where: {
      id: {
        exists: true,
      },
    },
  })

  for (const item of bureauRoles) {
    await payload.create({
      collection: 'bureau-roles',
      data: item,
    })
  }

  await payload.delete({
    collection: 'referents',
    where: {
      id: {
        exists: true,
      },
    },
  })

  for (const item of referents) {
    await payload.create({
      collection: 'referents',
      data: item,
    })
  }

  console.log('Seed terminé: bureau-roles et referents')
}

seedOrderedCollections()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
