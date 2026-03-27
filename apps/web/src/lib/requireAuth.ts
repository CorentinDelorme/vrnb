import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'

import payloadConfig from '@/payload.config'

import type { User } from '@/payload-types'

/**
 * Server-side helper to require authentication.
 * Redirects to /login if the user is not authenticated.
 * Returns the authenticated User object.
 */
export async function requireAuth(): Promise<User> {
  const cfg = await payloadConfig
  const payload = await getPayload({ config: cfg })
  const hdrs = await headers()

  const { user } = await payload.auth({ headers: hdrs })

  if (!user) {
    redirect('/login')
  }

  return user as User
}
