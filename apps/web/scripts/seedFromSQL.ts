import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

/**
 * Parse SQL INSERT statements from SQL dump file
 */
function parseSQLFile(filePath: string): Map<string, any[]> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const dataMap = new Map<string, any[]>()

  // Match INSERT INTO statements
  const insertRegex = /INSERT INTO `(\w+)` VALUES\s*\((.*?)\);/gs

  let match
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1]
    const valuesString = match[2]

    if (!dataMap.has(tableName)) {
      dataMap.set(tableName, [])
    }

    // Parse individual value rows
    const rowRegex = /\((.*?)\)(?:,\s*\(|;)/g
    let rowMatch
    while ((rowMatch = rowRegex.exec(valuesString)) !== null) {
      const valuesPart = rowMatch[1]
      const values = parseValues(valuesPart)
      dataMap.get(tableName)!.push(values)
    }
  }

  return dataMap
}

/**
 * Parse a comma-separated list of SQL values
 */
function parseValues(valueString: string): any[] {
  const values: any[] = []
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < valueString.length; i++) {
    const char = valueString[i]

    if ((char === '"' || char === "'") && (i === 0 || valueString[i - 1] !== '\\')) {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (char === ',' && !inString) {
      values.push(parseValue(current.trim()))
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    values.push(parseValue(current.trim()))
  }

  return values
}

/**
 * Parse a single SQL value
 */
function parseValue(value: string): any {
  if (value === 'NULL') return null
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  // Remove quotes
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1')
  }

  // Try to parse as number
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  return value
}

/**
 * Seed the database with data from SQL file
 */
async function seedDatabase() {
  const sqlFileArg = process.argv[2]
  if (!sqlFileArg) {
    console.error('Usage: bun run seed:sql <path-to-sql-file>')
    process.exit(1)
  }

  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const sqlFilePath = path.isAbsolute(sqlFileArg)
      ? sqlFileArg
      : path.resolve(process.cwd(), sqlFileArg)
    console.log(`Reading SQL file from: ${sqlFilePath}`)

    const dataMap = parseSQLFile(sqlFilePath)

    // Define the order of inserts to respect foreign keys
    const tableOrder = [
      'etat',
      'categorie',
      'categorie_formation',
      'bureau',
      'lieu',
      'referent',
      'user',
      'partenaire',
      'activite',
      'actualite',
      'categorie',
      'commentaire',
      'doc_pdf',
      'documentation',
      'etiquette_content',
      'intro_photo',
      'photo',
      'photo_album',
      'photo_carousel',
      'user_activite',
      'user_referent',
    ]

    for (const tableName of tableOrder) {
      if (!dataMap.has(tableName)) continue

      const rows = dataMap.get(tableName) || []
      console.log(`Processing ${tableName}: ${rows.length} rows`)

      for (const row of rows) {
        try {
          const doc = mapRowToDocument(tableName, row)
          if (doc) {
            await payload.create({
              collection: getCollectionSlug(tableName) as any,
              data: doc,
            })
          }
        } catch (error) {
          console.error(`Error processing row in ${tableName}:`, error)
        }
      }
    }

    console.log('Database seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

/**
 * Map SQL table names to Payload collection slugs
 */
function getCollectionSlug(tableName: string): string {
  const slugMap: { [key: string]: string } = {
    etat: 'etat',
    categorie: 'categorie',
    categorie_formation: 'categorie-formation',
    bureau: 'bureau',
    lieu: 'lieu',
    referent: 'referent',
    user: 'users',
    partenaire: 'partenaire',
    activite: 'activite',
    actualite: 'actualite',
    commentaire: 'commentaire',
    doc_pdf: 'doc-pdf',
    documentation: 'documentation',
    etiquette_content: 'etiquette-content',
    intro_photo: 'intro-photo',
    photo: 'photo',
    photo_album: 'photo-album',
    photo_carousel: 'photo-carousel',
    activite_content: 'activite-content',
  }
  return slugMap[tableName] || tableName
}

/**
 * Map SQL row data to Payload document structure
 */
function mapRowToDocument(tableName: string, row: any[]): any {
  const mapping: { [key: string]: (row: any[]) => any } = {
    etat: (row) => ({ libelle: row[1] }),
    categorie: (row) => ({ libelle: row[1] }),
    categorie_formation: (row) => ({ libelle: row[1] }),
    bureau: (row) => ({ nom: row[1], ordre: row[2] }),
    lieu: (row) => ({
      nom_ville: row[1],
      cp_ville: row[2],
      num_rue: row[3],
      nom_rue: row[4],
    }),
    referent: (row) => ({ nom: row[1], ordre: row[2] }),
    user: (row) => {
      const doc: any = {
        username: row[1],
        nom: row[4],
        prenom: row[5],
        email: row[7],
      }
      if (row[6]) doc.telephone = row[6]
      if (row[8]) doc.date_naissance = row[8]
      if (row[9]) doc.bureau = row[9]
      return doc
    },
    partenaire: (row) => ({
      ordre: row[1],
      nom: row[2],
      lien: row[3],
    }),
    activite: (row) => ({
      etat: row[2],
      lieu: row[3],
      organisateur: row[4],
      nom: row[5],
      date_activite: row[6],
      duree: row[7],
      distance: row[8],
      infos_activite: row[9],
      denivele: row[10],
      difficulte: row[11],
      categories_formation: row[12],
      url_album_photo: row[13],
      url_album_photo_deux: row[14],
      pdf: row[15],
      pdf_modification: row[16],
      total_participant: row[17],
    }),
    actualite: (row) => ({
      actu: row[1],
      date_actu: row[2],
      affiche_actu: row[3],
      url: row[4],
    }),
    commentaire: (row) => ({
      documentation: row[2],
      user_name: row[3],
      date_creation: row[4],
      date_modification: row[5],
      commentaire: row[6],
    }),
    doc_pdf: (row) => ({
      pdfactivite: row[2],
      nompdf: row[3],
    }),
    documentation: (row) => ({
      date_creation: row[2],
      auteur: row[3],
      titre: row[4],
      paragraphe1: row[5],
      paragraphe2: row[6],
      image: row[7],
      url: row[8],
      intro: row[9],
      image2: row[10],
      date_modifier: row[11],
      image_modification: row[12],
      image_legende: row[13],
      image_modification2: row[14],
      image_legende2: row[15],
      categorie: row[16],
      pdf: row[17],
      pdf_modification: row[18],
    }),
    etiquette_content: (row) => ({
      first_etiquette_text: row[2],
      first_etiquette_photo: row[3],
      second_etiquette_text: row[4],
      second_etiquette_photo: row[5],
      third_etiquette_text: row[6],
      third_etiquette_photo: row[7],
      fourth_etiquette_text: row[8],
      fourth_etiquette_photo: row[9],
      first_etiquette_overlay: row[10],
      second_etiquette_overlay: row[11],
      third_etiquette_overlay: row[12],
      fourth_etiquette_overlay: row[13],
    }),
    intro_photo: (row) => ({
      presentation_photo_intro: row[2],
      organisation_photo_intro: row[3],
      rando_velo_photo_intro: row[4],
      formation_photo_intro: row[5],
      projection_film_photo_intro: row[6],
      ecocitoyennete_photo_intro: row[7],
      autre_photo_intro: row[8],
      programme_photo_intro: row[9],
      album_photo_photo_intro: row[10],
      trombi_photo_intro: row[11],
      profil_photo_intro: row[12],
      documentation_photo_intro: row[13],
    }),
    photo: (row) => ({
      adhherent: row[2],
      name: row[3],
    }),
    photo_album: (row) => ({
      activite: row[2],
      image: row[3],
      url: row[4],
    }),
    photo_carousel: (row) => ({
      image1: row[2],
      image2: row[3],
      image3: row[4],
      image4: row[5],
      image5: row[6],
      image6: row[7],
      image7: row[8],
    }),
  }

  const mapper = mapping[tableName]
  return mapper ? mapper(row) : null
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error('Failed to seed database:', error)
  process.exit(1)
})
