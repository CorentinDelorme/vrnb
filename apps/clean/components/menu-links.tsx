import { ListViewIcon, MapsLocationIcon, UploadIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { MenuLinkKind } from '../lib/menu-links';
import { menuLinks } from '../lib/menu-links';

/** Icon per drawer link kind, matching the legacy drawer templates. */
const LINK_ICONS: Record<MenuLinkKind, typeof MapsLocationIcon> = {
  'pdf-carte': MapsLocationIcon,
  'global-map': ListViewIcon,
  'import-parcours': UploadIcon,
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
        <li key={`${link.kind}-${link.href}`}>
          <a
            href={link.href}
            download={link.kind === 'pdf-carte' ? '' : undefined}
            target={link.kind === 'pdf-carte' ? '_blank' : undefined}
            rel={link.kind === 'pdf-carte' ? 'noopener noreferrer' : undefined}
            className="flex items-center gap-2"
          >
            <HugeiconsIcon icon={LINK_ICONS[link.kind]} strokeWidth={1.5} />
            {link.label}
          </a>
        </li>
      ))}
    </>
  );
}
