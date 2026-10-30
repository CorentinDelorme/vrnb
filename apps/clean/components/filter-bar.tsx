'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from 'cn';

import type { DistanceInterval, TourFilterType } from '../src/app/tours-filter';
import { DistanceRangeSlider } from './distance-range-slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

/** One option of the Type de parcours segmented control. */
interface TypeChoice {
  readonly value: TourFilterType;
  readonly label: string;
}

/** The three options of the Type de parcours segmented control, "Tous" first. */
const TYPE_CHOICES: readonly TypeChoice[] = [
  { value: 'all' as TourFilterType, label: 'Tous' },
  { value: 'P' as TourFilterType, label: 'À pied' },
  { value: 'V' as TourFilterType, label: 'À vélo' },
];

/** Value of the single accordion item holding the filters panel. */
const FILTERS_ITEM_VALUE = 'filtres';

/** Desktop breakpoint (Tailwind `md`) above which the filters stay expanded. */
const DESKTOP_MIN_WIDTH = 768;

interface FilterBarProps {
  /** The currently selected filter type ("Tous" by default). */
  readonly type: TourFilterType;
  /** Called when the user picks another type. */
  readonly onTypeChange: (type: TourFilterType) => void;
  /** Distance de nettoyage interval (inactive when it spans the whole axis). */
  readonly cleaning: DistanceInterval;
  /** Called when the user moves a cleaning-distance handle. */
  readonly onCleaningChange: (value: DistanceInterval) => void;
  /** Distance totale interval (inactive when it spans the whole axis). */
  readonly total: DistanceInterval;
  /** Called when the user moves a total-distance handle. */
  readonly onTotalChange: (value: DistanceInterval) => void;
  /** How many tours match the current filters. */
  readonly displayedCount: number;
  /** Whether at least one filter family is active (touches the results). */
  readonly filterTouched: boolean;
  /** Resets every filter to its inactive state (no permanent reset button). */
  readonly onReset: () => void;
}

/**
 * Filter bar wrapped in an accordion whose trigger is "Filtres".
 *
 * The panel is folded (closed) by default on mobile so the bar does not eat
 * screen height, and expanded by default on desktop (PC). `keepMounted` keeps
 * the panel's DOM mounted while folded so the toggles and sliders stay
 * present in the document (and their controlled state is preserved) — only
 * their height collapses to zero.
 *
 * The Type de parcours filter is a single-selection shadcn/ui `ToggleGroup`
 * (`variant="outline"`, `spacing={0}` for the attached segmented look):
 * `[Tous | À pied | À vélo]`, with "Tous" pressed by default and the
 * `aria-pressed` state carried by the items. Pressing a pressed toggle
 * unpresses it, which keeps the previous filter instead of allowing "no type"
 * (the group always filters). The two distance slider families (Distance de
 * nettoyage and Distance totale) sit below the type control. Each is a
 * dual-handle range slider; an interval covering its whole axis means the
 * family is off.
 *
 * When at least one filter touches, a discreet counter ("X parcours
 * affichés", singular "1 parcours affiché") is shown; when zero tours match,
 * an empty-state message with a "Réinitialiser les filtres" button is shown
 * instead. No permanent reset button lives in the bar.
 */
export function FilterBar({
  type,
  onTypeChange,
  cleaning,
  onCleaningChange,
  total,
  onTotalChange,
  displayedCount,
  filterTouched,
  onReset,
}: FilterBarProps) {
  /** Whether the filters panel is expanded.
      Closed by default on both server and client (no hydration mismatch, no
      flash on mobile). After hydration, an effect opens it on desktop (PC). */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return undefined;
    }
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const update = () => setOpen(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  /** Whether the card is currently pinned by its sticky position.
      jsdom reports zero-size rects, which would read as "stuck", so they are
      treated as not stuck (the styling only matters in a real browser). */
  const [pinned, setPinned] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = card.getBoundingClientRect();
      setPinned(rect.width > 0 && rect.top <= 1);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
      return undefined;
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // While pinned the card spans the full viewport width, cancelling the root
  // `<main>` padding (p-4 sm:p-8) with matching negative margins; the corner
  // radii go away and the content padding mirrors `<main>`'s so the inner
  // controls keep aligning with the rest of the page.
  return (
    <Card
      ref={cardRef}
      className={cn('sticky top-0 z-10', pinned && '-mx-4 rounded-none sm:-mx-8')}
      aria-label="Filtres de parcours"
    >
      <CardContent className={pinned ? 'sm:px-8' : undefined}>
        {/* Visually hidden heading to maintain proper heading hierarchy (h1 -> h2 -> h3).
            The accordion trigger renders as h3, so we need an h2 in between. */}
        <h2 className="sr-only">Filtres de parcours</h2>
        <Accordion
          // Controlled for the lifetime of the component: `value` is never
          // `undefined` (empty array = closed), so React never sees it switch
          // between controlled and uncontrolled.
          value={open ? [FILTERS_ITEM_VALUE] : []}
          onValueChange={(next) => setOpen(next.includes(FILTERS_ITEM_VALUE))}
          keepMounted={true}
        >
          <AccordionItem value={FILTERS_ITEM_VALUE}>
            <AccordionTrigger className="text-sm sm:text-base :data-[slot=accordion-trigger-icon]:size-6 p-0">
              Filtres
            </AccordionTrigger>
            <AccordionContent keepMounted={true} className="pb-0">
              <div className="flex flex-col md:flex-row gap-4 md:gap-16">
                <div className="md:flex-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider w-full mb-2 block">
                    Type de parcours
                  </span>
                  {/* Single-selection toggle group: one pressed item at a time;
                      unpressing the pressed one keeps the previous filter (the
                      fallback below ignores the empty array). */}
                  <ToggleGroup
                    variant="outline"
                    spacing={0}
                    value={[type]}
                    aria-label="Type de parcours"
                    onValueChange={(next) => {
                      if (next.length > 0) onTypeChange(next[0] as TourFilterType);
                    }}
                  >
                    {TYPE_CHOICES.map((choice) => (
                      <ToggleGroupItem
                        key={choice.value}
                        value={choice.value}
                        // Pressed state in primary (override of the muted default,
                        // tailwind-merge drops the variant's aria-pressed:bg-muted).
                        className="aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
                      >
                        {choice.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <fieldset className="border-0 md:flex-1" aria-label="Distance de nettoyage (km)">
                  <DistanceRangeSlider
                    label="Distance de nettoyage (km)"
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={cleaning}
                    onChange={onCleaningChange}
                  />
                </fieldset>

                <fieldset className="border-0 md:flex-1" aria-label="Distance totale (km)">
                  <DistanceRangeSlider
                    label="Distance totale (km)"
                    min={2}
                    max={11}
                    step={1}
                    value={total}
                    onChange={onTotalChange}
                  />
                </fieldset>
              </div>

              {/* Counter or empty-state message, plus a reset button whenever at
                  least one filter touches (permanent reset button). */}
              {filterTouched ? (
                <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  {displayedCount === 0 ? (
                    <p className="text-sm font-medium text-muted-foreground mb-0!">
                      Aucun parcours ne correspond à ces filtres
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground mb-0!">
                      {displayedCount === 1
                        ? '1 parcours affiché'
                        : `${displayedCount} parcours affichés`}
                    </p>
                  )}
                  <Button type="button" variant="outline" onClick={onReset}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
