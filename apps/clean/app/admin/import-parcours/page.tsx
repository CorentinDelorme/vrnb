import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ImportParcoursForm } from '../../../components/import-parcours-form';

/**
 * `/admin/import-parcours` — Parcours import page (ticket #43).
 *
 * Available in development only: any other environment answers 404 via
 * `notFound()`, mirroring `POST /api/import-parcours` (ticket #42). The UI is
 * a client component that posts GPX files and a zone id to the import API.
 */

export function generateMetadata(): Metadata {
  return { title: 'Import de parcours' };
}

export default function ImportParcoursPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <ImportParcoursForm />;
}
