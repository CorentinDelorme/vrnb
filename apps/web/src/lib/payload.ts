import { getPayload } from 'payload'

import payloadConfig from '@/payload.config'

/**
 * Reusable helper to get the Payload instance — avoids repeating
 * the two-step config-await + getPayload pattern in every page.
 */
export async function getPayloadInstance() {
  const cfg = await payloadConfig
  return getPayload({ config: cfg })
}
