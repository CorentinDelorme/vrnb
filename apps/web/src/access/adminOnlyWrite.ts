import type { Access } from 'payload'

import { canAccessAdmin } from './canAccessAdmin'

/**
 * Allows read access to everyone, but restricts create/update/delete
 * to admin users only (those with the "site web" referent).
 */
export const adminOnlyWrite: {
  create: Access
  update: Access
  delete: Access
} = {
  create: canAccessAdmin,
  update: canAccessAdmin,
  delete: canAccessAdmin,
}
