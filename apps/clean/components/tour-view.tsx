'use client';

import { CancelIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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

/** Custom stepper stylisé shadcn : les étapes atteintes sont secondaires,
 * l'étape courante en primaire, et un trait relie les étapes. */
function Stepper({ step }: { readonly step: TourStep }) {
  return (
    <div className="flex items-center justify-between w-full max-w-md px-4 sm:px-6">
      {STEP_LABELS.map((label, index) => {
        const reached = step >= index;
        const current = step === index;
        const last = index === STEP_LABELS.length - 1;
        return (
          <div key={label} className="flex flex-col items-center gap-1.5 relative z-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  current
                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20'
                    : reached
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {!last && <div className={`h-px flex-1 ${reached ? 'bg-primary' : 'bg-border'}`} />}
            </div>
            <span
              className={`text-xs font-medium transition-colors ${current ? 'text-primary font-bold' : reached ? 'text-secondary' : 'text-muted-foreground'}`}
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

      <div className="dock max-sm:dock-xs flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={prevStep}>
          Précédent
        </Button>
        {step === STEP_LABELS.length - 1 ? (
          <Button variant="default" size="sm" onClick={finish}>
            Terminer
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={nextStep}>
            Suivant
          </Button>
        )}
      </div>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent id="finish_modal" className="modal-box">
          <form method="dialog">
            <button
              aria-label="Fermer"
              className="btn btn-sm btn-ghost btn-circle absolute top-2 right-2"
            >
              <HugeiconsIcon icon={CancelIcon} strokeWidth={1.5} />
            </button>
          </form>

          <h3 className="text-lg font-bold">Merci pour votre participation !</h3>
          <p className="py-4">
            Allez voir les organisateurs pour faire peser les déchets ramassés.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
