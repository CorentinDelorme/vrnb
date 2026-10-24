import Link from 'next/link';

import { cn } from '@/components/lib/utils';
import { InscriptionsOpeningAnnouncement } from '../components/inscriptions-opening-announcement';
import { InscriptionsStatusProvider } from '../components/inscriptions-status-provider';
import { ResumeTourBanner } from '../components/resume-tour-banner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ZoneList } from '../components/zone-list';

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
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="mb-4 sm:mb-8">
        <Card className="shadow-sm border">
          <CardContent className="py-3 sm:py-4 flex flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium sm:text-base">
              Première visite ? Suivez l&apos;exemple du parcours Bruz Sud P2.
            </p>
            <Link
              href="/manual"
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'shrink-0')}
            >
              Mode d&apos;emploi
            </Link>
          </CardContent>
        </Card>
      </div>

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

      <div className="mb-4 sm:mb-8">
        <Accordion defaultValue={['presse']} aria-label="Articles Ouest-France 2026">
          <AccordionItem value="presse">
            <AccordionTrigger className="flex items-center gap-4">
              <img className="h-auto w-28" src="/icons/ouest-france.svg" alt="Logo Ouest-France" />
              Articles Ouest-France 2026
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base border-t border-base-200">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <footer className="pt-4 text-center text-sm opacity-70 sm:pt-8">©{currentYear} VRNB</footer>
    </>
  );
}
