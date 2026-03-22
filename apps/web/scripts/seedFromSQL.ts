import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import type { BasePayload, CollectionSlug } from 'payload'
import config from '../src/payload.config.js'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'
type SQLPrimitive = string | number | boolean | null
type SQLRow = SQLPrimitive[]
type LegacyID = number
type PayloadID = string | number

const DEFAULT_USER_PASSWORD = process.env.PAYLOAD_USER_PASSWORD || 'password'

const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
const logDir = path.resolve(process.cwd(), 'logs')
fs.mkdirSync(logDir, { recursive: true })
const logFilePath = path.join(logDir, `seed-${logTimestamp}.log`)
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })

function log(level: LogLevel, ...args: unknown[]) {
  const line = `[${new Date().toISOString()}] [${level}] ${args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message
      }

      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      }

      return String(arg)
    })
    .join(' ')}`

  console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](line)
  logStream.write(`${line}\n`)
}

process.on('exit', () => logStream.end())

function parseSQLFile(filePath: string): Map<string, SQLRow[]> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const dataMap = new Map<string, SQLRow[]>()
  const insertRegex = /INSERT INTO `(\w+)` VALUES\s*(.+?);/gs

  for (const match of content.matchAll(insertRegex)) {
    const tableName = match[1]
    const rows = splitInsertRows(match[2]).map(parseValues)

    if (!dataMap.has(tableName)) {
      dataMap.set(tableName, [])
    }

    dataMap.get(tableName)?.push(...rows)
  }

  return dataMap
}

function splitInsertRows(input: string): string[] {
  const rows: string[] = []
  let current = ''
  let depth = 0
  let inString = false
  let quoteChar = ''

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const previousChar = i > 0 ? input[i - 1] : ''

    if (inString) {
      current += char

      if (char === quoteChar && previousChar !== '\\') {
        inString = false
        quoteChar = ''
      }

      continue
    }

    if ((char === "'" || char === '"') && previousChar !== '\\') {
      inString = true
      quoteChar = char
      current += char
      continue
    }

    if (char === '(') {
      if (depth > 0) {
        current += char
      }
      depth++
      continue
    }

    if (char === ')') {
      depth--

      if (depth === 0) {
        rows.push(current)
        current = ''
      } else {
        current += char
      }

      continue
    }

    if (depth > 0) {
      current += char
    }
  }

  return rows
}

function parseValues(valueString: string): SQLRow {
  const values: SQLRow = []
  let current = ''
  let inString = false
  let quoteChar = ''

  for (let i = 0; i < valueString.length; i++) {
    const char = valueString[i]
    const previousChar = i > 0 ? valueString[i - 1] : ''

    if ((char === "'" || char === '"') && previousChar !== '\\') {
      if (!inString) {
        inString = true
        quoteChar = char
      } else if (char === quoteChar) {
        inString = false
        quoteChar = ''
      }
    }

    if (char === ',' && !inString) {
      values.push(parseValue(current.trim()))
      current = ''
      continue
    }

    current += char
  }

  if (current.trim() !== '') {
    values.push(parseValue(current.trim()))
  }

  return values
}

function parseValue(value: string): SQLPrimitive {
  if (value === 'NULL') return null
  if (value === 'true') return true
  if (value === 'false') return false

  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return decodeSQLString(value.slice(1, -1))
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  }

  return value
}

function decodeSQLString(value: string): string {
  return value
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function asString(value: SQLPrimitive): string | undefined {
  if (value === null) return undefined
  const result = String(value)
  return result === '' ? undefined : result
}

function asNumber(value: SQLPrimitive): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asBoolean(value: SQLPrimitive): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return undefined
}

function asDate(value: SQLPrimitive): string | undefined {
  const result = asString(value)
  if (!result) return undefined
  if (result === '0000-00-00' || result === '0000-00-00 00:00:00') return undefined
  return result
}

function toRichText(value: SQLPrimitive) {
  const text = asString(value)

  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: text
            ? [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text,
                  version: 1,
                },
              ]
            : [],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function getCollectionSlug(tableName: string): string | null {
  const slugMap: Record<string, string> = {
    activite: 'activite',
    activite_content: 'activite-content',
    actualite: 'actualite',
    bureau: 'bureau',
    categorie: 'categorie',
    categorie_formation: 'categorie-formation',
    commentaire: 'commentaire',
    doc_pdf: 'doc-pdf',
    documentation: 'documentation',
    etiquette_content: 'etiquette-content',
    etat: 'etat',
    intro_photo: 'intro-photo',
    lieu: 'lieu',
    partenaire: 'partenaire',
    photo: 'photo',
    photo_album: 'photo-album',
    photo_carousel: 'photo-carousel',
    referent: 'referent',
    user: 'users',
  }

  return slugMap[tableName] ?? null
}

function getLegacyId(row: SQLRow): LegacyID {
  if (typeof row[0] !== 'number') {
    throw new Error(`Invalid legacy ID: ${String(row[0])}`)
  }

  return row[0]
}

function rememberId(
  indexes: Map<string, Map<LegacyID, PayloadID>>,
  tableName: string,
  row: SQLRow,
  payloadId: PayloadID,
) {
  const legacyId = getLegacyId(row)

  if (!indexes.has(tableName)) {
    indexes.set(tableName, new Map())
  }

  indexes.get(tableName)?.set(legacyId, payloadId)
}

function resolveId(
  indexes: Map<string, Map<LegacyID, PayloadID>>,
  tableName: string,
  legacyValue: SQLPrimitive,
): PayloadID | undefined {
  const legacyId = asNumber(legacyValue)
  if (legacyId === undefined) return undefined
  return indexes.get(tableName)?.get(legacyId)
}

function getUserEmail(row: SQLRow, legacyId: LegacyID): string {
  return (asString(row[7]) || `legacy-user-${legacyId}@vrnb.local`).toLowerCase()
}

function mapRowToDocument(
  tableName: string,
  row: SQLRow,
  indexes: Map<string, Map<LegacyID, PayloadID>>,
  rowIndex: number,
) {
  switch (tableName) {
    case 'etat':
      return { libelle: asString(row[1]) }

    case 'categorie':
      return { libelle: asString(row[1]) }

    case 'categorie_formation':
      return { libelle: asString(row[1]) }

    case 'bureau':
      return { nom: asString(row[1]), ordre: asNumber(row[2]) }

    case 'lieu':
      return {
        nom_ville: asString(row[1]),
        cp_ville: asString(row[2]),
        num_rue: asString(row[3]),
        nom_rue: asString(row[4]),
      }

    case 'referent':
      return { nom: asString(row[1]), ordre: asNumber(row[2]) }

    case 'user': {
      const legacyId = getLegacyId(row)
      return {
        username: asString(row[1]),
        nom: asString(row[4]),
        prenom: asString(row[5]),
        email: getUserEmail(row, legacyId),
        password: DEFAULT_USER_PASSWORD,
        telephone: asString(row[6]),
        date_naissance: asDate(row[8]),
        bureau: resolveId(indexes, 'bureau', row[9]),
      }
    }

    case 'partenaire':
      return {
        ordre: rowIndex + 1,
        nom: asString(row[1]),
        url: asString(row[3]),
      }

    case 'activite_content':
      return {
        balade_text: toRichText(row[1]),
        escapade_text: toRichText(row[2]),
        mecanique_text: toRichText(row[3]),
        securite_text: toRichText(row[4]),
        secourisme_text: toRichText(row[5]),
        photo_video_text: toRichText(row[6]),
        projection_film_text: toRichText(row[7]),
        autre_text: toRichText(row[8]),
        balade_photo: asString(row[9]),
        escapade_photo: asString(row[10]),
        mecanique_photo: asString(row[11]),
        securite_photo: asString(row[12]),
        secourisme_photo: asString(row[13]),
        photo_video_photo: asString(row[14]),
        projection_film_photo: asString(row[15]),
        ecocitoyennete_text: toRichText(row[16]),
        ecocitoyennete_photo: asString(row[17]),
        autre_photo: asString(row[18]),
        formation_text_intro: toRichText(row[19]),
        randovelo_text_intro: toRichText(row[20]),
        projectionfilm_text_intro: toRichText(row[21]),
        ecocitoyennete_text_intro: toRichText(row[22]),
        autres_text_intro: toRichText(row[23]),
        balade_title: asString(row[24]),
        escapade_title: asString(row[25]),
        mecanique_title: asString(row[26]),
        securite_title: asString(row[27]),
        secourisme_title: asString(row[28]),
        photo_video_title: asString(row[29]),
        projection_film_title: asString(row[30]),
        autre_title: asString(row[31]),
        ecocitoyennete_title: asString(row[32]),
      }

    case 'activite':
      return {
        etat: resolveId(indexes, 'etat', row[1]),
        lieu: resolveId(indexes, 'lieu', row[2]),
        organisateur: resolveId(indexes, 'user', row[3]),
        nom: asString(row[4]),
        date_activite: asDate(row[5]),
        duree: asNumber(row[6]),
        distance: asNumber(row[7]),
        infos_activite: asString(row[8]),
        denivele: asNumber(row[9]),
        difficulte: asNumber(row[10]),
        categories_formation: resolveId(indexes, 'categorie_formation', row[11]),
        url_album_photo: asString(row[12]),
        url_album_photo_deux: asString(row[13]),
        pdf: asString(row[14]),
        pdf_modification: asString(row[15]),
        total_participant: asNumber(row[16]),
      }

    case 'actualite':
      return {
        actu: asString(row[1]),
        date_actu: asDate(row[2]),
        affiche_actu: asBoolean(row[3]),
        url: asString(row[4]),
      }

    case 'documentation':
      return {
        date_creation: asDate(row[1]),
        auteur: asString(row[2]),
        titre: asString(row[3]),
        paragraphe1: toRichText(row[4]),
        paragraphe2: toRichText(row[5]),
        image: asString(row[6]),
        url: asString(row[7]),
        intro: toRichText(row[8]),
        image2: asString(row[9]),
        date_modifier: asDate(row[10]),
        image_modification: asString(row[11]),
        image_legende: asString(row[12]),
        image_modification2: asString(row[13]),
        image_legende2: asString(row[14]),
        categorie: resolveId(indexes, 'categorie', row[15]),
        pdf: asString(row[16]),
        pdf_modification: asString(row[17]),
      }

    case 'commentaire':
      return {
        documentation: resolveId(indexes, 'documentation', row[1]),
        user_name: asString(row[2]),
        date_creation: asDate(row[3]),
        date_modification: asDate(row[4]),
        commentaire: toRichText(row[5]),
      }

    case 'doc_pdf':
      return {
        pdfactivite: resolveId(indexes, 'activite', row[1]),
        nompdf: asString(row[2]),
      }

    case 'etiquette_content':
      return {
        first_etiquette_text: asString(row[1]),
        first_etiquette_photo: asString(row[2]),
        second_etiquette_text: asString(row[3]),
        second_etiquette_photo: asString(row[4]),
        third_etiquette_text: asString(row[5]),
        third_etiquette_photo: asString(row[6]),
        fourth_etiquette_text: asString(row[7]),
        fourth_etiquette_photo: asString(row[8]),
        first_etiquette_overlay: asString(row[9]),
        second_etiquette_overlay: asString(row[10]),
        third_etiquette_overlay: asString(row[11]),
        fourth_etiquette_overlay: asString(row[12]),
      }

    case 'intro_photo':
      return {
        presentation_photo_intro: asString(row[1]),
        organisation_photo_intro: asString(row[2]),
        rando_velo_photo_intro: asString(row[3]),
        formation_photo_intro: asString(row[4]),
        projection_film_photo_intro: asString(row[5]),
        ecocitoyennete_photo_intro: asString(row[6]),
        autre_photo_intro: asString(row[7]),
        programme_photo_intro: asString(row[8]),
        album_photo_photo_intro: asString(row[9]),
        trombi_photo_intro: asString(row[10]),
        profil_photo_intro: asString(row[11]),
        documentation_photo_intro: asString(row[12]),
      }

    case 'photo':
      return {
        adhherent: resolveId(indexes, 'user', row[1]),
        name: asString(row[2]),
      }

    case 'photo_album':
      return {
        activite: resolveId(indexes, 'activite', row[1]),
        image: asString(row[2]),
        url: asString(row[3]),
      }

    case 'photo_carousel':
      return {
        image1: asString(row[1]),
        image2: asString(row[2]),
        image3: asString(row[3]),
        image4: asString(row[4]),
        image5: asString(row[5]),
        image6: asString(row[6]),
        image7: asString(row[7]),
      }

    default:
      return null
  }
}

async function clearCollection(payload: BasePayload, collection: CollectionSlug) {
  let deleted = 0

  while (true) {
    const result = await payload.find({
      collection,
      depth: 0,
      limit: 100,
      overrideAccess: true,
      page: 1,
    })

    if (!result.docs.length) {
      break
    }

    for (const doc of result.docs) {
      await payload.delete({
        collection,
        overrideAccess: true,
        where: {
          id: {
            equals: doc.id,
          },
        },
      })

      deleted++
    }
  }

  if (deleted > 0) {
    log('INFO', `Cleared ${deleted} existing documents from ${collection}`)
  }
}

async function clearImportedCollections(payload: BasePayload, tableOrder: string[]) {
  const collections = [
    ...new Set(
      tableOrder.map(getCollectionSlug).filter((value): value is string => Boolean(value)),
    ),
  ].reverse()

  for (const collection of collections) {
    await clearCollection(payload, collection as CollectionSlug)
  }
}

async function applyUserReferents(
  payload: BasePayload,
  rows: SQLRow[],
  indexes: Map<string, Map<LegacyID, PayloadID>>,
) {
  const referentsByUser = new Map<PayloadID, Set<PayloadID>>()

  for (const row of rows) {
    const userId = resolveId(indexes, 'user', row[0])
    const referentId = resolveId(indexes, 'referent', row[1])

    if (!userId || !referentId) {
      log('WARN', 'Skipping user_referent row because one relation is missing', row)
      continue
    }

    if (!referentsByUser.has(userId)) {
      referentsByUser.set(userId, new Set())
    }

    referentsByUser.get(userId)?.add(referentId)
  }

  for (const [userId, referents] of referentsByUser) {
    await payload.update({
      collection: 'users',
      // @ts-expect-error -- Payload types don't allow updating a relation with an array of IDs, but it works at runtime
      data: { referents: [...referents] },
      overrideAccess: true,
      where: {
        id: {
          equals: userId,
        },
      },
    })
  }
}

async function applyActivityParticipants(
  payload: BasePayload,
  rows: SQLRow[],
  indexes: Map<string, Map<LegacyID, PayloadID>>,
) {
  const participantsByActivity = new Map<PayloadID, Set<PayloadID>>()

  for (const row of rows) {
    const userId = resolveId(indexes, 'user', row[0])
    const activiteId = resolveId(indexes, 'activite', row[1])

    if (!userId || !activiteId) {
      log('WARN', 'Skipping user_activite row because one relation is missing', row)
      continue
    }

    if (!participantsByActivity.has(activiteId)) {
      participantsByActivity.set(activiteId, new Set())
    }

    participantsByActivity.get(activiteId)?.add(userId)
  }

  for (const [activiteId, participants] of participantsByActivity) {
    await payload.update({
      collection: 'activite',
      // @ts-expect-error -- Payload types don't allow updating a relation with an array of IDs, but it works at runtime
      data: { participants: [...participants] },
      overrideAccess: true,
      where: {
        id: {
          equals: activiteId,
        },
      },
    })
  }
}

async function seedDatabase() {
  const sqlFileArg = process.argv[2]

  if (!sqlFileArg) {
    log('ERROR', 'Usage: bun run seed:sql <path-to-sql-file>')
    process.exit(1)
  }

  log('INFO', `Log file: ${logFilePath}`)

  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    const sqlFilePath = path.isAbsolute(sqlFileArg)
      ? sqlFileArg
      : path.resolve(process.cwd(), sqlFileArg)

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`)
    }

    log('INFO', `Reading SQL file from: ${sqlFilePath}`)

    const dataMap = parseSQLFile(sqlFilePath)
    const tableOrder = [
      'etat',
      'categorie',
      'categorie_formation',
      'bureau',
      'lieu',
      'referent',
      'user',
      'partenaire',
      'activite_content',
      'actualite',
      'etiquette_content',
      'intro_photo',
      'photo_carousel',
      'documentation',
      'activite',
      'doc_pdf',
      'photo',
      'photo_album',
      'commentaire',
    ]
    const indexes = new Map<string, Map<LegacyID, PayloadID>>()
    let createdCount = 0

    await clearImportedCollections(payload, tableOrder)

    const unsupportedTables = [...dataMap.keys()].filter(
      (tableName) =>
        !tableOrder.includes(tableName) && !['user_activite', 'user_referent'].includes(tableName),
    )

    if (unsupportedTables.length > 0) {
      log('WARN', `Unsupported SQL tables skipped: ${unsupportedTables.join(', ')}`)
    }

    for (const tableName of tableOrder) {
      const collection = getCollectionSlug(tableName)
      const rows = dataMap.get(tableName) ?? []

      if (!collection || rows.length === 0) {
        continue
      }

      log('INFO', `Processing ${tableName}: ${rows.length} rows`)

      for (const [rowIndex, row] of rows.entries()) {
        try {
          const data = mapRowToDocument(tableName, row, indexes, rowIndex)

          if (!data) {
            log('WARN', `No mapper available for ${tableName}, skipping row`, row)
            continue
          }

          const created = await payload.create({
            collection: collection as CollectionSlug,
            data,
            overrideAccess: true,
          })

          rememberId(indexes, tableName, row, created.id)
          createdCount++
        } catch (error) {
          log('ERROR', `Error processing row ${rowIndex + 1} in ${tableName}:`, { row, error })
          throw error
        }
      }
    }

    await applyActivityParticipants(payload, dataMap.get('user_activite') ?? [], indexes)
    await applyUserReferents(payload, dataMap.get('user_referent') ?? [], indexes)

    log('INFO', `Database seeding completed successfully. Created ${createdCount} documents.`)
  } catch (error) {
    log('ERROR', 'Error seeding database:', error)
    process.exit(1)
  }
}

seedDatabase().catch((error) => {
  log('ERROR', 'Failed to seed database:', error)
  process.exit(1)
})
