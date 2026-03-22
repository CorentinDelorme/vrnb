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
    lien: 'https://www.ouest-france.fr/bretagne/bruz-35170/lentreprise-brucyclette-est-installee-pres-de-la-gare-01f29b4d-450a-865f-b9dfd120a9d8',
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

const randosVeloSeed = {
  title: 'Randonnées à vélo',
  subtitle: 'Vous pouvez visualiser ci-dessous les différentes randonnées à vélo',
  blocks: [
    {
      blockType: 'rando-velo-block' as const,
      title: 'La balade du dimanche matin',
      text: `Chaque mois au moins une sortie autour de Rennes est programmée. Départ 9h30, la durée de la balade est d'environ 2h30. Les parcours proposés – pour des raisons de sécurité - privilégient l'emprunt des voies vertes des chemins de halage !!\n\nLa distance entre 25 à 30 kms, est accessible à toutes et à tous. Un vélo tout chemin (VTC), y compris à assistance électrique est adapté aux types de chemins empruntés. A chaque balade est associée la découverte et la présentation d'un ou deux sites remarquables (naturel ou culturel).`,
      photo: 'https://velorandonaturebruz.fr/photo-activite/ca389929370995a89bff7b91d6091ed7.jpg',
    },
    {
      blockType: 'rando-velo-block' as const,
      title: 'Périple Printanier',
      text: `En 2023, le premier "périple printanier" a été organisé du 2 au 4 juin. Les 18 cyclotes et cyclos ont parcouru 200 kms en 3 étapes.\n\nPremière étape : Bruz - Augan, Deuxième étape : Augan- Mauron, troisième étape : Mauron - Bruz\n\nDu 7 au 9 juin 2024, cap au nord est, le deuxième "périple printanier" nous emmènera à Mézieres sur Couesnon (1ère étape) et à Châtillon en Vendelais (2ème étape).\n\nUne visite de Fougères est programmée le deuxième jour.\n\nLe parcours qui emprunte en priorité les voies vertes et les pistes cyclables est accessible à Toutes et à Tous (yc les VAE).`,
      photo: 'https://velorandonaturebruz.fr/photo-activite/94e6f882e6d9b550bdb6ac14c254126f.jpg',
    },
  ],
}

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

  await payload.updateGlobal({
    slug: 'randos-velo',
    data: randosVeloSeed,
  })

  console.log('Seed terminé: bureau-roles, referents, partenaires et randos-velo')
}

seedOrderedCollections()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
