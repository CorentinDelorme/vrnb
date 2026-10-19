'use client';

import { ArrowLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { headerFlags, pageTitle } from '../lib/route-meta';
import { MenuDrawer } from './menu-drawer';
import { MenuLinks } from './menu-links';
import { TourDrawerLinks } from './tour-drawer-links';

/**
 * App header — port of the legacy Angular root template (`app.html`): back
 * button / VRNB logo, the visible page title `<h1>`, and the Menu drawer on
 * `/tour/…` and `/tours/…` routes (spec #3). The title comes from the same
 * `pageTitle()` used by `generateMetadata`, so `<title>` and `<h1>` never drift.
 */
export function AppHeader() {
  const pathname = usePathname();
  const flags = headerFlags(pathname);
  const title = pageTitle(pathname);

  return (
    <header className="flex items-center gap-4 pb-4 sm:pb-8">
      {flags.showBack ? (
        <Link className="btn btn-primary btn-sm" href="/" aria-label="Retour à l'accueil">
          <HugeiconsIcon className="text-primary-content" icon={ArrowLeftIcon} strokeWidth={1.5} />
        </Link>
      ) : null}

      {flags.showLogo ? <img className="h-15.75 w-16" src="/icons/vrnb.png" alt="VRNB" /> : null}

      <h1 className="text-secondary text-2xl font-bold sm:text-4xl">{title}</h1>

      {flags.menu ? (
        <MenuDrawer className="ml-auto" variant={flags.menu} title={title}>
          {flags.menu === 'tours' ? <MenuLinks pathname={pathname} /> : null}
          {flags.menu === 'tour' ? <TourDrawerLinks /> : null}
        </MenuDrawer>
      ) : null}
    </header>
  );
}
