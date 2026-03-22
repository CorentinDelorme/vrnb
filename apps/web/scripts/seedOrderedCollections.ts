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

const partenaires = [
  {
    ordre: 1,
    nom: "Sonorisation l'Eclipse",
    lien: 'https://animateur-dj-leclipse.fr/',
  },
  {
    ordre: 2,
    nom: "OZ'TaKom",
    lien: 'https://velorandonaturebruz.fr/oztakom@gmail.com',
  },
  {
    ordre: 3,
    nom: 'Marche aquatique Brehec',
    lien: 'http://marcheaquatiquebrehec.over-blog.com/',
  },
  {
    ordre: 4,
    nom: 'Komoot',
    lien: 'https://www.komoot.fr/',
  },
  {
    ordre: 5,
    nom: 'GUEDARD Cycles',
    lien: 'https://www.cycles-guedard.com/',
  },
  {
    ordre: 6,
    nom: 'France vélo Tourisme',
    lien: 'https://www.francevelotourisme.com/',
  },
  {
    ordre: 7,
    nom: 'ESOLT',
    lien: 'https://velorandonaturebruz.fr/patrickderex@free.fr',
  },
  {
    ordre: 8,
    nom: 'ENI Chartres de Bretagne',
    lien: 'https://www.eni-ecole.fr/',
  },
  {
    ordre: 9,
    nom: 'Brucyclette',
    lien: 'https://www.ouest-france.fr/bretagne/bruz-35170/lentreprise-brucyclette-est-installee-pres-de-la-gare-01f29b4d-cb4d-450a-865f-b9dfd120a9d8',
  },
  {
    ordre: 10,
    nom: 'BIKESPORT - BRUZ',
    lien: 'https://bikesport-cesson.fr/',
  },
  {
    ordre: 11,
    nom: 'Ariane la librairie du voyage',
    lien: 'https://www.librairie-voyage.com/',
  },
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

  await payload.delete({
    collection: 'partenaires',
    where: {
      id: {
        exists: true,
      },
    },
  })

  for (const item of partenaires) {
    await payload.create({
      collection: 'partenaires',
      data: item,
    })
  }

  console.log('Seed terminé: bureau-roles, referents et partenaires')
}

seedOrderedCollections()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
