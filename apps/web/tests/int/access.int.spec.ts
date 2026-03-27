import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Admin access control', () => {
  const adminEmail = 'int-admin@vrnb-test.fr'
  const regularEmail = 'int-regular@vrnb-test.fr'

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean up any existing test users
    await payload.delete({
      collection: 'users',
      where: { email: { in: [adminEmail, regularEmail] } },
    })

    // Ensure "site web" referent exists
    let siteWebReferent
    const existingRef = await payload.find({
      collection: 'referents',
      where: { nom: { equals: 'site web' } },
      limit: 1,
    })

    if (existingRef.docs.length > 0) {
      siteWebReferent = existingRef.docs[0]
    } else {
      siteWebReferent = await payload.create({
        collection: 'referents',
        data: { nom: 'site web', ordre: 999 },
        overrideAccess: true,
      })
    }

    // Create admin user (has "site web" referent)
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: 'testadmin123',
        username: 'int_admin',
        nom: 'Int',
        prenom: 'Admin',
        referents: [siteWebReferent.id],
      },
      overrideAccess: true,
    })

    // Create regular user (no referent)
    await payload.create({
      collection: 'users',
      data: {
        email: regularEmail,
        password: 'testuser123',
        username: 'int_regular',
        nom: 'Int',
        prenom: 'Regular',
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'users',
      where: { email: { in: [adminEmail, regularEmail] } },
    })
  })

  it('fetches users', async () => {
    const users = await payload.find({ collection: 'users' })
    expect(users).toBeDefined()
    expect(users.docs.length).toBeGreaterThan(0)
  })

  it('admin user has site web referent', async () => {
    const result = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      depth: 1,
    })
    expect(result.docs.length).toBe(1)
    const user = result.docs[0]
    expect(user.referents).toBeDefined()
    expect(Array.isArray(user.referents)).toBe(true)
    const referentNames = (user.referents as Array<{ nom: string }>).map((r) =>
      r.nom.trim().toLowerCase(),
    )
    expect(referentNames).toContain('site web')
  })

  it('regular user does not have site web referent', async () => {
    const result = await payload.find({
      collection: 'users',
      where: { email: { equals: regularEmail } },
      depth: 1,
    })
    expect(result.docs.length).toBe(1)
    const user = result.docs[0]
    const referents = user.referents as Array<{ nom: string }> | undefined
    if (referents && referents.length > 0) {
      const referentNames = referents.map((r) => r.nom?.trim().toLowerCase())
      expect(referentNames).not.toContain('site web')
    }
  })
})
