import type { Metadata } from 'next';

import { GlobalToursMap } from '../../components/global-tours-map';
import { pageTitle } from '../../lib/route-meta';

/**
 * Global tours map route `/tours` — all tours from all zones and types
 * on one map.
 */

export async function generateMetadata(): Promise<Metadata> {
  return { title: pageTitle('/tours') };
}

export default function GlobalToursMapPage() {
  return (
    <div className="flex w-full flex-col">
      <GlobalToursMap />
    </div>
  );
}
