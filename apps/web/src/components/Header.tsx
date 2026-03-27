import { headers } from 'next/headers'

import { getPayload } from 'payload'

import config from '@/payload.config'
import { HeaderClient } from './HeaderClient'

import type { Home, Media, User } from '@/payload-types'

/** Resolve the user from the Payload auth cookie (server-side) */
async function getCurrentUser(): Promise<User | null> {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    const hdrs = await headers()

    const { user } = await payload.auth({ headers: hdrs })
    return (user as User) ?? null
  } catch {
    return null
  }
}

/** Get the logo URL from the Home global */
async function getLogoUrl(): Promise<string | null> {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    const home: Home = await payload.findGlobal({ slug: 'home' })

    const logo = home.logo as Media | string | null | undefined
    if (logo && typeof logo !== 'string' && logo.url) {
      return logo.url
    }
    return null
  } catch {
    return null
  }
}

export async function Header() {
  const [user, logoUrl] = await Promise.all([getCurrentUser(), getLogoUrl()])

  const isAuthenticated = !!user

  return (
    <HeaderClient
      isAuthenticated={isAuthenticated}
      userId={user?.id ?? null}
      logoUrl={logoUrl}
    />
  )
}
