'use client';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Fusionne des classes Tailwind (clsx) puis résout les conflits (tailwind-merge).
 * Utilisé par tous les composants shadcn de l'app.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
