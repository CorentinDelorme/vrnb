import Link from 'next/link';

import { InscriptionsStatusProvider } from '../components/inscriptions-status-provider';
import { ResumeTourBanner } from '../components/resume-tour-banner';
import { TourListSection } from '../components/tour-list-section';
import { findZoneTours } from '../src/app/tours-queries';
import { ZONES } from '../src/app/zones';

/**
 * Home page `/` — port of the legacy Angular `tours-list` component
 * (spec #3, ticket #6): the mode d'emploi promo card, the resume banner when
 * a tour is in progress, one open accordion per zone listing its bike and
 * walking tours, the Ouest-France press collapse, and the footer. The visible
 * `<h1>` and `<title>` come from the root layout header (spec #3); everything
 * here is statically prerendered, and the resume banner as well as the public
 * inscriptions statuses (ticket #16) hydrate client-side.
 */

/** Press articles shown in the home collapse (content, kept verbatim). */
const ARTICLES = [
  {
    title: 'Bruz. Ils organisent une sortie pour ramasser les déchets',
    url: 'https://www.ouest-france.fr/bretagne/bruz-35170/ils-organisent-une-sortie-pour-ramasser-les-dechets-44c38453-b187-40f9-abfb-186708158729',
  },
  {
    title: 'Bruz. 201 kg de déchets ramassés dans la nature',
    url: 'https://www.ouest-france.fr/bretagne/bruz-35170/bruz-201-kg-de-dechets-ramasses-dans-la-nature-d7b699b7-1e8a-4dd6-adc6-73e3c14fe959',
  },
] as const;

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="mb-4 sm:mb-8">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body flex-row items-center justify-between gap-4 py-3 sm:py-4">
            <p className="text-sm font-medium sm:text-base">
              Première visite ? Suivez l&apos;exemple du parcours Bruz Sud P2.
            </p>
            <Link className="btn btn-primary btn-sm shrink-0 sm:btn-md" href="/manual">
              Mode d&apos;emploi
            </Link>
          </div>
        </div>
      </div>

      <ResumeTourBanner />

      <InscriptionsStatusProvider>
        {ZONES.map((zone) => {
          const bikeTours = findZoneTours(zone.id, 'V');
          const walkingTours = findZoneTours(zone.id, 'P');
          const hasTours = bikeTours.length > 0 || walkingTours.length > 0;
          const hasBothTypes = bikeTours.length > 0 && walkingTours.length > 0;

          return (
            <details
              className="collapse collapse-arrow bg-base-100 border border-base-300 mb-4 shadow-md sm:mb-8"
              aria-label={`Zone ${zone.name}`}
              key={zone.id}
              open
            >
              <summary className="collapse-title flex items-center gap-3 sm:gap-4">
                <h2 className="text-secondary text-2xl font-bold tracking-wide sm:text-4xl">
                  {zone.name}
                </h2>
                <span className="badge badge-secondary badge-md sm:badge-lg">
                  {bikeTours.length + walkingTours.length} parcours
                </span>
              </summary>
              <div className="collapse-content">
                {hasTours ? (
                  <div
                    className={`grid grid-cols-1 gap-4 pt-2 sm:gap-8${
                      hasBothTypes ? ' lg:grid-cols-2' : ''
                    }`}
                  >
                    {bikeTours.length > 0 ? (
                      <TourListSection
                        title="Parcours à vélo"
                        tours={bikeTours}
                        type="V"
                        zoneId={zone.id}
                      />
                    ) : null}
                    {walkingTours.length > 0 ? (
                      <TourListSection
                        title="Parcours à pied"
                        tours={walkingTours}
                        type="P"
                        zoneId={zone.id}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </InscriptionsStatusProvider>

      <div className="mb-4 sm:mb-8">
        <details className="collapse collapse-arrow bg-base-100 border border-base-300 shadow-sm">
          <summary className="collapse-title text-sm font-semibold sm:text-base flex items-center gap-4">
            <img className="h-auto w-28" src="/icons/ouest-france.svg" alt="Logo Ouest-France" />
            Articles Ouest-France 2026
          </summary>

          <div className="collapse-content">
            <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base border-t border-base-200 pt-4">
              {ARTICLES.map((article) => (
                <li key={article.url}>
                  <a
                    className="link link-secondary font-medium"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      <footer className="pt-4 text-center text-sm opacity-70 sm:pt-8">©{currentYear} VRNB</footer>
    </>
  );
}
