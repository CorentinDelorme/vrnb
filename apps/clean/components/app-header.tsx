'use client';

import { ArrowLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState } from 'react';

import { cn } from '@/components/lib/utils';
import { headerFlags, pageTitle } from '../lib/route-meta';
import { MenuDrawer } from './menu-drawer';
import { MenuLinks } from './menu-links';
import { TourDrawerLinks } from './tour-drawer-links';
import { buttonVariants } from './ui/button';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  // "Bruz Sud - Parcours P7" → ["Bruz Sud", "Parcours P7"]: the parts stack on
  // two lines on mobile and rejoin with the dash on wider screens.
  const titleParts = title.split(' - ');

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 pb-4 sm:pb-8">
      {/* Left controls share the first column so the title always sits on the
          back button's row (placing them as separate grid items would stack
          them — and drag the title along — on /manual). */}
      <div className="col-start-1 flex items-center gap-4">
        {flags.showBack ? (
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
          >
            <HugeiconsIcon
              className="text-primary-foreground"
              icon={ArrowLeftIcon}
              strokeWidth={1.5}
            />
          </Link>
        ) : null}

        {/* /manual shows the logo next to the back button on wide screens and
            drops it on mobile to leave room for the title. */}
        {flags.showLogo ? (
          <img
            className={flags.showBack ? 'hidden h-15.75 w-16 sm:block' : 'h-15.75 w-16'}
            src="/icons/vrnb.png"
            alt="VRNB"
          />
        ) : null}
      </div>

      {/* Middle `1fr` column: the title spans the full width between the edge
          controls. On mobile it stacks — zone name, then the Parcours label —
          each line centered between the buttons; `aria-label` keeps the full
          joined title as the accessible name. */}
      <h1
        aria-label={title}
        className="text-secondary col-start-2 text-center text-lg font-bold sm:text-4xl"
      >
        {titleParts.map((part, index) => (
          <Fragment key={part}>
            {index > 0 ? <span className="hidden sm:inline"> - </span> : null}
            <span className="block sm:inline">{part}</span>
          </Fragment>
        ))}
      </h1>

      {flags.menu ? (
        <MenuDrawer
          className="col-start-3"
          variant={flags.menu}
          title={title}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        >
          {flags.menu === 'tours' ? <MenuLinks pathname={pathname} /> : null}
          {flags.menu === 'tour' ? <TourDrawerLinks /> : null}
        </MenuDrawer>
      ) : null}
    </header>
  );
}
