'use client';

import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';

import { clearSavedTour, loadSavedTour, saveTour } from '../src/app/tour-storage';
import type { TourStep } from '../src/app/tours-queries';
import { TourMap } from './tour-map';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';

/**
 * Step-by-step tour page — port of the legacy Angular `tour/tour.ts` +
 * `tour/tour.html` (spec #3): the Début/Nettoyage/Fin state machine, the dock
 * (Précédent / Suivant / Terminer), the `vrnb_tour` localStorage persistence
 * and the finish modal with confetti. The map itself is ticket #11's scope and
 * is reached through the `TourMap` seam.
 */

/** Step labels, in state-machine order. */
const STEP_LABELS = ['Début', 'Nettoyage', 'Fin'] as const;

/**
 * Compact centered stepper, parity with the mode d'emploi screenshots: fixed
 * 32px circles (reached = solid secondary green, upcoming = muted disc), a
 * thick 4px connector drawn edge-to-edge between two neighbouring circles
 * (green once the following step is reached) and the label right below.
 */
function Stepper({ step }: { readonly step: TourStep }) {
  return (
    <div className="flex items-start mx-auto w-fit">
      {STEP_LABELS.map((label, index) => {
        const reached = step >= index;
        const last = index === STEP_LABELS.length - 1;
        return (
          <div
            key={label}
            data-testid={`step-${index}`}
            className="flex flex-col items-center gap-1 w-20 relative z-0"
          >
            {!last && (
              <div
                aria-hidden="true"
                className={`absolute top-3.5 left-[calc(50%+16px)] w-[calc(100%-32px)] h-1 transition-colors duration-300 ${step > index ? 'bg-secondary' : 'bg-border'}`}
              />
            )}
            <div
              data-testid={`step-${index}-circle`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                reached
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-border text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`text-sm font-medium transition-colors ${reached ? 'text-secondary' : 'text-foreground'}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface TourViewProps {
  readonly zoneId: string;
  readonly tourId: string;
}

export function TourView({ zoneId, tourId }: TourViewProps) {
  const [step, setStepState] = useState<TourStep>(0);
  const [finishOpen, setFinishOpen] = useState(false);

  // Restore the saved step when it matches this tour, otherwise record the
  // freshly started tour (parity with the Angular constructor).
  useEffect(() => {
    const saved = loadSavedTour();
    if (saved && saved.tourId === tourId && saved.zoneId === zoneId) {
      setStepState(saved.step);
    } else {
      saveTour(tourId, 0, zoneId);
    }
  }, [tourId, zoneId]);

  const setStep = (next: TourStep): void => {
    setStepState(next);
    saveTour(tourId, next, zoneId);
  };

  const prevStep = (): void => {
    // The range guards keep the arithmetic inside the TourStep union.
    if (step > 0) setStep((step - 1) as TourStep);
  };

  const nextStep = (): void => {
    if (step < STEP_LABELS.length - 1) setStep((step + 1) as TourStep);
  };

  const finish = (): void => {
    setFinishOpen(true);
    clearSavedTour();
    void confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-8">
      <Stepper step={step} />

      <div className="flex w-full justify-center">
        <TourMap step={step} zoneId={zoneId} tourId={tourId} />
      </div>

      {/* Bottom dock, parity with the mode d'emploi screenshots: the
          Précédent action is a plain text button centred in the left half and
          the Suivant / Terminer action a big primary button centred in the
          right half. */}
      <div className="max-sm:dock-xs flex w-full items-center px-4">
        <div className="flex flex-1 items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            className="font-semibold"
            disabled={step === 0}
            onClick={prevStep}
          >
            Précédent
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          {step === STEP_LABELS.length - 1 ? (
            <Button variant="default" size="lg" className="w-32 font-semibold" onClick={finish}>
              Terminer
            </Button>
          ) : (
            <Button variant="default" size="lg" className="w-32 font-semibold" onClick={nextStep}>
              Suivant
            </Button>
          )}
        </div>
      </div>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent id="finish_modal">
          <h3 className="text-lg font-bold">Merci pour votre participation !</h3>
          <p className="py-4">
            Allez voir les organisateurs pour faire peser les déchets ramassés.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
