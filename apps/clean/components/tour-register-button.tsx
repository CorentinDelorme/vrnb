'use client';

import { UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import type { TourRef } from '../src/app/tours-queries';
import { RegisterBinomeModal } from './register-binome-modal';

/**
 * Register button of one Parcours row (ticket #17): a small labeled action
 * placed next to the play button, opening the shared-looking DaisyUI
 * registration modal for that tour. The button carries an explicit
 * `aria-label` naming its tour (the row has no other button text, and the
 * a11y suite expects every row button to be named); its visible text is the
 * accessible-name prefix (WCAG 2.5.3 Label in Name, enforced by the axe audit
 * of the home page).
 *
 * The host gates the button with `available` instead of unmounting this
 * component: a row that gets covered WHILE a modal is open (created or 409
 * outcome) must still display the modal's confirmation or message while the
 * badge appears and the button disappears from the row.
 *
 * The modal is mounted once at first opening and then only toggled (native
 * dialog `showModal`), so a close without submitting keeps the typed identity
 * values until the whole page unmounts (the row itself never unmounts: this
 * component is rendered by every row and only hides its button).
 */

interface TourRegisterButtonProps {
  /**
   * Whether the row offers registration (an uncovered Parcours). When false
   * the button renders nothing, but a modal opened earlier stays mounted
   * until the page changes. A closed registration window keeps the button:
   * the modal itself explains that « l'action est passée » (ticket #18).
   */
  readonly available: boolean;
  readonly tour: TourRef;
}

export function TourRegisterButton({ available, tour }: TourRegisterButtonProps) {
  const [everOpened, setEverOpened] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <>
      {available ? (
        <button
          aria-label={`S'inscrire en Binôme pour le parcours ${tour.tourId}`}
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
      ) : null}

      {everOpened ? (
        <RegisterBinomeModal onClose={() => setVisible(false)} tour={tour} visible={visible} />
      ) : null}
    </>
  );
}
