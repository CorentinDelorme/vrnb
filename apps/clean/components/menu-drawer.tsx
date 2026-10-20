import { CancelIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';

import type { MenuVariant } from '../lib/route-meta';

/**
 * Menu drawer shell shown in the header on `/tour/…` and `/tours/…` routes.
 * Markup and ids match the legacy Angular tour and zone drawers so the E2E
 * selectors keep working (spec #3).
 *
 * The route-specific download links (PDF/GPX/GeoVelo) are passed as `children`
 * by the tour page (ticket #10) and the zone map page (ticket #9); the
 * foundation ships the shell only.
 */

/** Legacy drawer input ids, kept for DOM parity with the Angular templates. */
const DRAWER_IDS: Record<MenuVariant, string> = {
  tour: 'my-drawer-1',
  tours: 'tours-drawer',
};

const MENU_CLASSES: Record<MenuVariant, string> = {
  tour: 'menu bg-base-200 min-h-full w-60 gap-3 p-4 sm:w-80',
  tours: 'menu bg-base-200 min-h-full w-80 gap-3 p-4',
};

interface MenuDrawerProps {
  readonly variant: MenuVariant;
  readonly title: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

export function MenuDrawer({ variant, title, className, children }: MenuDrawerProps) {
  const drawerId = DRAWER_IDS[variant];

  return (
    <div className={className ? `drawer ${className}` : 'drawer'}>
      <input className="drawer-toggle" id={drawerId} type="checkbox" />
      <div className="drawer-content">
        <label className="btn btn-primary btn-sm drawer-button" htmlFor={drawerId}>
          Menu
        </label>
      </div>
      <div className="drawer-side">
        <label className="drawer-overlay" htmlFor={drawerId} aria-label="close sidebar" />

        <ul className={MENU_CLASSES[variant]}>
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-secondary text-2xl font-bold sm:text-4xl">{title}</h1>
            <label
              className="btn btn-sm btn-circle btn-ghost mt-1"
              htmlFor={drawerId}
              aria-label="close sidebar"
            >
              <HugeiconsIcon icon={CancelIcon} strokeWidth={1.5} />
            </label>
          </div>

          {children}
        </ul>
      </div>
    </div>
  );
}
