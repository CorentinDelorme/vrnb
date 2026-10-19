'use client';

import { MapsLocationIcon, Pdf02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { menuLinks, type MenuLinkKind } from '../lib/menu-links';

/** Icon per drawer link kind, matching the legacy drawer templates. */
const LINK_ICONS: Record<MenuLinkKind, typeof Pdf02Icon> = {
  'pdf-suivi': Pdf02Icon,
  'pdf-carte': MapsLocationIcon,
};

/**
 * Route-specific download links rendered inside the Menu drawer. The header
 * passes the current pathname; links are derived by `lib/menu-links` (spec #3).
 */
export function MenuLinks({ pathname }: { readonly pathname: string }) {
  return (
    <>
      {menuLinks(pathname).map((link) => (
        <li key={link.kind}>
          <a href={link.href} download target="_blank" rel="noopener noreferrer">
            <HugeiconsIcon icon={LINK_ICONS[link.kind]} strokeWidth={1.5} />
            {link.label}
          </a>
        </li>
      ))}
    </>
  );
}
