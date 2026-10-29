import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TourRef } from '../src/app/tours-queries';
import { TourRegisterButton } from './tour-register-button';

/**
 * The register button of a tour row (ticket #17): it opens the registration
 * modal for its tour and keeps the modal mounted between close and reopen, so
 * the identity values typed into the dialog survive a close without
 * submitting.
 */

const TOUR: TourRef = { tourId: 'V1', zoneId: 'bruz-sud' };

/**
 * The modal reads the registration window from the provider (ticket #18):
 * the public state answers an open window, so the modal never depends on the
 * wall clock of the test runner. The real module is kept (only the hooks are
 * mocked): the modal reads the window through the shared rule of the provider.
 */
vi.mock('./inscriptions-status-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./inscriptions-status-provider')>()),
  useInscriptionsReload: () => vi.fn(),
  useInscriptionsStatus: () => ({
    state: {
      edition: {
        actionDate: '2027-02-14',
        actionEndTime: '12:00',
        actionStartTime: '09:00',
        inscriptionsOpenDate: '2027-01-04',
        year: 2027,
      },
      inscriptions: [],
      registrationOpen: true,
    },
    status: 'success',
  }),
}));

describe('TourRegisterButton', () => {
  it('should render a named register button for its tour, with no modal yet', () => {
    render(<TourRegisterButton available tour={TOUR} />);

    const button = screen.getByRole('button', {
      name: "S'inscrire en binôme pour le parcours V1",
    });
    expect(button.textContent).toContain("S'inscrire");
    // The modal content is portaled out of this container and is not mounted yet.
    expect(document.getElementById('register_modal_V1')).toBeNull();
  });

  it('should mount the modal in the document body once per opened modal', () => {
    const { container } = render(<TourRegisterButton available tour={TOUR} />);

    fireEvent.click(screen.getByRole('button', { name: /S'inscrire en binôme pour le parcours/ }));

    // The shadcn Dialog content is portaled to document.body and keeps the
    // legacy register_modal_<tourId> id on DialogContent.
    expect(document.getElementById('register_modal_V1')).not.toBeNull();
    // The register button of the row stays in place.
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('should hide the button of an unavailable row without opening any modal', () => {
    const { container } = render(<TourRegisterButton available={false} tour={TOUR} />);

    expect(container.querySelector('button')).toBeNull();
    expect(document.getElementById('register_modal_V1')).toBeNull();
  });
});
