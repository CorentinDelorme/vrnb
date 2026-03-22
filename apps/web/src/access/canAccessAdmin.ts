import type { PayloadRequest } from 'payload'

const ADMIN_REFERENT_NAME = 'site web'

function hasSiteWebReferent(referents: unknown): boolean {
  if (!Array.isArray(referents)) return false

  return referents.some((referent) => {
    if (!referent || typeof referent !== 'object') return false

    const referentName =
      'nom' in referent && typeof referent.nom === 'string'
        ? referent.nom.trim().toLowerCase()
        : undefined

    return referentName === ADMIN_REFERENT_NAME
  })
}

export async function canAccessAdmin({ req }: { req: PayloadRequest }): Promise<boolean> {
  if (!req.user) {
    return false
  }

  if (hasSiteWebReferent(req.user.referents)) {
    return true
  }

  const user = await req.payload.findByID({
    collection: 'users',
    id: req.user.id,
    depth: 1,
    overrideAccess: true,
  })

  return hasSiteWebReferent(user.referents)
}
