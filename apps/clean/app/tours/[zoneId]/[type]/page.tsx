import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ToursMap } from '../../../../components/tours-map';
import { pageTitle } from '../../../../lib/route-meta';
import type { TourMapParams } from '../../../../lib/tours-route';
import { isTourMapParams, zoneMapStaticParams, zoneMapTours } from '../../../../lib/tours-route';

/**
 * Zone map route `/tours/[zoneId]/[type]` (spec #3): statically generated for
 * ZONES × {P, V}, `notFound()` on any other zone or practice type — the
 * deliberate divergence from the legacy SPA shell (US 25).
 */
interface ToursMapPageProps {
  readonly params: Promise<{ readonly zoneId: string; readonly type: string }>;
}

export function generateStaticParams(): TourMapParams[] {
  return zoneMapStaticParams();
}

export async function generateMetadata({ params }: ToursMapPageProps): Promise<Metadata> {
  const { zoneId, type } = await params;
  return { title: pageTitle(`/tours/${zoneId}/${type}`) };
}

export default async function ToursMapPage({ params }: ToursMapPageProps) {
  const { zoneId, type } = await params;
  if (!isTourMapParams(zoneId, type)) {
    notFound();
  }

  return (
    <div className="flex w-full flex-col">
      <ToursMap zoneId={zoneId} tours={zoneMapTours(zoneId, type)} />
    </div>
  );
}
