'use client';

import Link from 'next/link';
import { InscriptionsOpeningAnnouncement } from '../components/inscriptions-opening-announcement';
import { InscriptionsStatusProvider } from '../components/inscriptions-status-provider';
import { ResumeTourBanner } from '../components/resume-tour-banner';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ZoneList } from '../components/zone-list';
import { Footer } from '../components/footer';

/**
 * Home page `/` — port of the legacy Angular `tours-list` component
 * (spec #3, ticket #6): the mode d'emploi promo card, the resume banner when
 * a tour is in progress, one open accordion per zone listing its bike and
 * walking tours, the Ouest-France press collapse, and the footer. The visible
 * `<h1>` and `<title>` come from the root layout header (spec #3); everything
 * here is statically prerendered, and the resume banner, the public
 * inscriptions statuses (ticket #16) and the inscriptions opening
 * announcement (ticket #34) hydrate client-side.
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
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Card>
        <CardContent className="flex flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium sm:text-base">
            Première visite ? Suivez l&apos;exemple du parcours Bruz Sud P2.
          </p>
          {/* Navigation, not an action: a Link carrying the button styling
          (the shadcn "As Link" pattern — never a `<Button>` inside a link). */}
          <Link href="/manual" className={buttonVariants({ variant: 'default' })}>
            Mode d&apos;emploi
          </Link>
        </CardContent>
      </Card>

      <ResumeTourBanner />

      <InscriptionsStatusProvider>
        {/* Ticket #34: one single mention announcing the inscriptions opening
        date while the window has not opened yet, above the zone accordions.
        Like the statuses themselves (ticket #16), it resolves client-side
        after hydration — the prerendered HTML carries nothing. */}
        <InscriptionsOpeningAnnouncement />
        {/* Ticket #51: the zone list is rendered by the `ZoneList` client
        component above, which carries the Type de parcours filter state and
        passes the filtered tours to each `TourListSection`. */}
        <ZoneList />
      </InscriptionsStatusProvider>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <img className="h-auto w-28" src="/icons/ouest-france.svg" alt="Logo Ouest-France" />
          <CardTitle className="text-secondary text-xl font-bold tracking-wide sm:text-2xl">
            Articles Ouest-France 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc flex flex-col gap-2 border-t border-border pt-3 pl-5 text-sm sm:text-base">
            {ARTICLES.map((article) => (
              <li key={article.url}>
                <a
                  className="font-medium text-secondary underline"
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {article.title}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
}
