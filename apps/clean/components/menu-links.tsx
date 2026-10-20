import { MapsLocationIcon, Pdf02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { MenuLinkKind } from '../lib/menu-links';
import { menuLinks } from '../lib/menu-links';

/** Icon per drawer link kind, matching the legacy drawer templates. */
const LINK_ICONS: Record<MenuLinkKind, typeof Pdf02Icon> = {
  'pdf-suivi': Pdf02Icon,
  'pdf-carte': MapsLocationIcon,
};

interface MenuLinksProps {
  readonly pathname: string;
}

/**
 * Route-specific download links rendered inside the Menu drawer. The header
 * (a client component) passes the current pathname; links are derived by
 * `lib/menu-links` (spec #3). No `'use client'` needed: this module only ever
 * renders inside the client `AppHeader` boundary.
 */
export function MenuLinks({ pathname }: MenuLinksProps) {
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
