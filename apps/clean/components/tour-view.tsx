'use client';

import { CancelIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';

import { clearSavedTour, loadSavedTour, saveTour } from '../src/app/tour-storage';
import { TourMap } from './tour-map';

/**
 * Step-by-step tour page — port of the legacy Angular `tour/tour.ts` +
 * `tour/tour.html` (spec #3): the Début/Nettoyage/Fin state machine, the dock
 * (Précédent / Suivant / Terminer), the `vrnb_tour` localStorage persistence
 * and the finish modal with confetti. The map itself is ticket #11's scope and
 * is reached through the `TourMap` seam.
 */

/** Step labels, in state-machine order. */
const STEP_LABELS = ['Début', 'Nettoyage', 'Fin'] as const;

/** DaisyUI step classes: reached steps are secondary, the current one is too. */
function stepClassName(step: number, index: number): string {
  const classes = ['step'];
  if (step >= index) classes.push('step-secondary');
  if (step === index) classes.push('text-secondary');
  return classes.join(' ');
}

interface TourViewProps {
  readonly zoneId: string;
  readonly tourId: string;
}

export function TourView({ zoneId, tourId }: TourViewProps) {
  const [step, setStepState] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const setStep = (next: number): void => {
    setStepState(next);
    saveTour(tourId, next, zoneId);
  };

  const prevStep = (): void => {
    if (step > 0) setStep(step - 1);
  };

  const nextStep = (): void => {
    if (step < STEP_LABELS.length - 1) setStep(step + 1);
  };

  const finish = (): void => {
    dialogRef.current?.showModal();
    clearSavedTour();
    void confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-8">
      <ul className="steps">
        {STEP_LABELS.map((label, index) => (
          <li className={stepClassName(step, index)} key={label}>
            {label}
          </li>
        ))}
      </ul>

      <div className="flex w-full justify-center">
        <TourMap step={step} zoneId={zoneId} tourId={tourId} />
      </div>

      <div className="dock max-sm:dock-xs">
        <button className="btn btn-ghost max-sm:btn-sm" disabled={step === 0} onClick={prevStep}>
          Précédent
        </button>
        {step === STEP_LABELS.length - 1 ? (
          <button className="btn btn-primary max-sm:btn-sm" onClick={finish}>
            Terminer
          </button>
        ) : (
          <button className="btn btn-primary max-sm:btn-sm" onClick={nextStep}>
            Suivant
          </button>
        )}
      </div>

      <dialog className="modal" id="finish_modal" ref={dialogRef}>
        <div className="modal-box">
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
        </div>
      </dialog>
    </div>
  );
}
