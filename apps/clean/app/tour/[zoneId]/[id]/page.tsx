import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TourView } from '../../../../components/tour-view';
import { pageTitle } from '../../../../lib/route-meta';
import { ALL_TOURS, findTour } from '../../../../src/app/tours-queries';
import { ZONES } from '../../../../src/app/zones';

/**
 * `/tour/<zone>/<id>` — step-by-step parcours page (spec #3, ticket #10).
 *
 * URLs are frozen by the printed QR codes: one static route per generated tour
 * (47 today), and any unknown zone or tour id falls through to `notFound()` —
 * the deliberate divergence from the legacy broken-shell 200.
 */

interface TourPageProps {
  readonly params: Promise<{ readonly zoneId: string; readonly id: string }>;
}

/** One static route per tour (parity with the Angular prerender: 47 pages). */
export function generateStaticParams(): { zoneId: string; id: string }[] {
  return ALL_TOURS.map((tour) => ({ zoneId: tour.zoneId, id: tour.name }));
}

export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const { zoneId, id } = await params;
  return { title: pageTitle(`/tour/${zoneId}/${id}`) };
}

export default async function TourPage({ params }: TourPageProps) {
  const { zoneId, id } = await params;

  if (!ZONES.some((zone) => zone.id === zoneId)) notFound();
  if (!findTour(zoneId, id)) notFound();

  return <TourView tourId={id} zoneId={zoneId} />;
}
