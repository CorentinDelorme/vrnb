'use client';

import { UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import type { TourRef } from '../src/app/tours-queries';
import { RegisterBinomeModal } from './register-binome-modal';

/**
 * Register button of one uncovered Parcours row (ticket #17): a small labeled
 * action placed next to the play button, opening the shared-looking DaisyUI
 * registration modal for that tour. The button carries an explicit
 * `aria-label` naming its tour (the row has no other button text, and the
 * a11y suite expects every row button to be named).
 *
 * The modal is mounted once at first opening and then only toggled (native
 * dialog `showModal`), so a close without submitting keeps the typed identity
 * values until the row disappears (tour covered after a reload) or the whole
 * page unmounts.
 */

interface TourRegisterButtonProps {
  readonly tour: TourRef;
}

export function TourRegisterButton({ tour }: TourRegisterButtonProps) {
  const [everOpened, setEverOpened] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <button
        aria-label={`Inscrire un binôme pour le parcours ${tour.tourId}`}
        className="btn btn-outline btn-secondary max-sm:btn-xs max-sm:max-w-none btn-sm sm:btn-md"
        onClick={() => {
          setEverOpened(true);
          setVisible(true);
        }}
        type="button"
      >
        <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={1.5} />
        S&apos;inscrire
      </button>

      {everOpened ? (
        <RegisterBinomeModal
          onClose={() => setVisible(false)}
          tour={tour}
          visible={visible}
        />
      ) : null}
    </>
  );
}
