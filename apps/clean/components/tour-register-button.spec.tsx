import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TourRef } from '../src/app/tours-queries';
import { TourRegisterButton } from './tour-register-button';

/**
 * The register button of a tour row (ticket #17): it opens the registration
 * modal for its tour — exactly one `showModal` per open — and keeps the modal
 * mounted between close and reopen, so the identity values typed into the
 * dialog survive a close without submitting.
 */

const TOUR: TourRef = { tourId: 'V1', zoneId: 'bruz-sud' };

/** The `showModal` call log, filled by the patched prototype. */
const showModal = vi.hoisted(() => vi.fn());

/**
 * jsdom implements no dialog method at all: patch the two the components use,
 * mimicking the native behavior (the modal opening, and the `close` event of
 * the native dialog).
 */
function installDialogueStub(): void {
  const prototype = HTMLDialogElement.prototype as unknown as {
    showModal?: () => void;
    close?: () => void;
  };
  prototype.showModal = function showModalStub(this: HTMLDialogElement) {
    showModal();
  };
  prototype.close = function closeStub(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close', { bubbles: false }));
  };
}

describe('TourRegisterButton', () => {
  beforeEach(() => {
    showModal.mockClear();
    installDialogueStub();
  });

  it('should render a named register button for its tour, with no modal yet', () => {
    const { container } = render(<TourRegisterButton tour={TOUR} />);

    const button = screen.getByRole('button', {
      name: 'Inscrire un binôme pour le parcours V1',
    });
    expect(button.textContent).toContain("S'inscrire");
    // The modal is not mounted before the first click.
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('should mount the modal and call showModal exactly once per opened modal', async () => {
    const { container } = render(<TourRegisterButton tour={TOUR} />);

    fireEvent.click(screen.getByRole('button', { name: /Inscrire un binôme pour le parcours/ }));

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(container.querySelector('dialog#register_modal')).not.toBeNull();
  });
});
