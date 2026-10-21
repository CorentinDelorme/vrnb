import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  BinomeRegistration,
  RegistrationOutcome,
} from '../src/app/inscriptions/inscriptions-client';
import type { TourRef } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { RegisterBinomeModal } from './register-binome-modal';

/**
 * Behavior of the DaisyUI registration modal (tickets #17 + #18): the submit
 * stays gated on the four identity fields plus the engagement statement, a
 * created outcome posts the exact contract body, shows the confirmation and
 * reloads the statuses; a 409 shows the covered-meantime guard and reloads
 * too; each refusal (invalid saisie, anti-bot honeypot, closed window) and
 * the network failures show their own explicit message without reloading. No
 * submit resets the fields — a close without submitting keeps the values.
 */

const TOUR: TourRef = { tourId: 'V1', zoneId: 'bruz-sud' };

/** Mocks of the module boundary + provider hook, scripted per test. */
const mocks = vi.hoisted(() => ({
  postRegistration: vi.fn<(registration: BinomeRegistration) => Promise<RegistrationOutcome>>(() =>
    Promise.resolve({ status: 'created' }),
  ),
  reload: vi.fn(),
}));

/** The public state the provider hook answers for the ongoing render. */
const status = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('../src/app/inscriptions/inscriptions-client', () => ({
  postRegistration: mocks.postRegistration,
}));

vi.mock('./inscriptions-status-provider', () => ({
  useInscriptionsReload: () => mocks.reload,
  useInscriptionsStatus: () => status.current as InscriptionsStatus,
}));

/** The public state of an open registration window. */
const OPEN_STATUS: InscriptionsStatus = {
  state: {
    edition: { actionDate: '2027-02-14', year: 2027 },
    inscriptions: [],
    registrationOpen: true,
  },
  status: 'success',
};

/** The public state of a closed registration window (the action date is past). */
const CLOSED_STATUS: InscriptionsStatus = {
  state: {
    edition: { actionDate: '2027-02-14', year: 2027 },
    inscriptions: [],
    registrationOpen: false,
  },
  status: 'success',
};

/**
 * jsdom implements no dialog method: patch the two the modal lives on. The
 * native submit of the `<form method="dialog">` close button and `Escape` are
 * then simulated directly through the patched `close` (the jsdom event gives
 * the component its `close` listener).
 */
function installDialogueStub(onClose: () => void): void {
  const prototype = HTMLDialogElement.prototype as unknown as {
    showModal?: () => void;
    close?: () => void;
  };
  prototype.showModal = function showModalStub(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  prototype.close = function closeStub(this: HTMLDialogElement) {
    onClose();
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Render the modal open and return helpers for one test. */
function renderModal() {
  const onClose = vi.fn();
  installDialogueStub(onClose);
  const render_ = render(<RegisterBinomeModal onClose={onClose} tour={TOUR} visible />);
  return { ...render_, onClose };
}

const submitButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /Inscrire mon binôme/ }) as HTMLButtonElement;

/** The four identity inputs, by label, in DOM order. */
function identityInputs(): readonly HTMLInputElement[] {
  return (
    ['Prénom du membre 1', 'Nom du membre 1', 'Prénom du membre 2', 'Nom du membre 2'] as const
  ).map((label) => screen.getByLabelText(label) as HTMLInputElement);
}

/** Fill every identity field, tick the engagement statement. */
function fillBinome(): void {
  const values = ['Léa', 'Dupont', 'Marc', 'Martin'];
  for (const [index, input] of identityInputs().entries()) {
    fireEvent.change(input, { target: { value: values[index] } });
  }
  fireEvent.click(screen.getByRole('checkbox', { name: /engageons/ }));
}

/** The hidden anti-bot honeypot of the modal. */
function honeypotInput(): HTMLInputElement {
  const input = document.querySelector('input[name="website"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('honeypot not found');
  return input;
}

describe('RegisterBinomeModal', () => {
  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = OPEN_STATUS;
  });

  it('should show the tour context: Parcours, Zone, action day, meeting point', () => {
    renderModal();
    const context = screen.getByText(/Parcours/).textContent ?? '';
    expect(context).toContain('V1');
    expect(context).toContain('Bruz Sud');
    expect(screen.getByText(/Jour de l'action/).textContent).toContain('14 février 2027');
    expect(screen.getAllByText(/Point de rendez-vous/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Point de rendez-vous/).textContent).toContain('Place du Dr Joly');
  });

  it('should keep the submit disabled until the form is complete', () => {
    renderModal();
    expect(submitButton().disabled).toBe(true);

    // Only two identities typed, the engagement still unchecked:
    fireEvent.change(identityInputs()[0]!, { target: { value: 'Léa' } });
    expect(submitButton().disabled).toBe(true);

    fillBinome();
    expect(submitButton().disabled).toBe(false);
  });

  it('should not call the API while the submit is gated', () => {
    renderModal();
    fireEvent.click(submitButton());
    expect(mocks.postRegistration).not.toHaveBeenCalled();
  });

  it('should post the exact context+identity and confirm on 201', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'created' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.postRegistration).toHaveBeenCalledOnce());

    expect(mocks.postRegistration.mock.calls[0]?.[0]).toEqual({
      firstName1: 'Léa',
      firstName2: 'Marc',
      honeypot: '',
      lastName1: 'Dupont',
      lastName2: 'Martin',
      tourId: 'V1',
      zoneId: 'bruz-sud',
    });
    expect(mocks.reload).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert').textContent).toContain('Votre binôme est inscrit');
  });

  it('should trim the identity values sent to the API', async () => {
    renderModal();
    fireEvent.change(identityInputs()[0]!, { target: { value: '  Léa  ' } });
    fireEvent.change(identityInputs()[1]!, { target: { value: 'Dupont' } });
    fireEvent.change(identityInputs()[2]!, { target: { value: 'Marc' } });
    fireEvent.change(identityInputs()[3]!, { target: { value: 'Martin' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /engageons/ }));
    mocks.postRegistration.mockResolvedValueOnce({ status: 'created' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.postRegistration).toHaveBeenCalledOnce());
    expect(mocks.postRegistration.mock.calls[0]?.[0]?.firstName1).toBe('Léa');
  });

  it('should keep the typed values when the dialog closes without submitting', () => {
    const { onClose } = renderModal();
    fireEvent.change(identityInputs()[0]!, { target: { value: 'Léa' } });

    // The native close (X button, backdrop, Escape) fires the `close` event;
    // the component must not reset anything, the host keeps it mounted.
    (
      screen.getByText('Inscription du binôme').closest('dialog') as HTMLDialogElement
    ).dispatchEvent(new Event('close'));
    expect(onClose).toHaveBeenCalledOnce();
    expect((identityInputs()[0] as HTMLInputElement).value).toBe('Léa');
  });

  it('should guard on 409: covered-meantime message + statuses reload', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'taken' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('couvert'));

    expect(screen.getByRole('alert').textContent).toMatch(/couvert par un autre binôme/);
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('should show the distinct invalid feedback on 400 without reloading', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'invalid' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Saisie invalide'));

    expect(screen.getByRole('alert').textContent).toMatch(/Saisie invalide/);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it('should show the distinct anti-bot feedback on a filled honeypot', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'bot' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('anti-robots'));

    expect(screen.getByRole('alert').textContent).toMatch(/filtre anti-robots/);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it('should show the distinct closed-window feedback on a closed window answer', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'closed' });

    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain("L'action est passée"),
    );

    expect(screen.getByRole('alert').textContent).toMatch(/inscriptions sont closes/);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it('should show the distinct network-error feedback without reloading', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'error' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('erreur'));

    expect(screen.getByRole('alert').textContent).toMatch(/Une erreur est survenue/);
    expect(mocks.reload).not.toHaveBeenCalled();
  });
});

/**
 * The anti-bot honeypot and the data retention notice (ticket #18): the hidden
 * field is in the DOM (a bot fills it) but a human never sees nor reaches it,
 * and the modal states how long the names are kept.
 */
describe('RegisterBinomeModal honeypot and GDPR notice', () => {
  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = OPEN_STATUS;
  });

  it('should render the honeypot hidden from the humans', () => {
    renderModal();
    const honeypot = honeypotInput();

    expect(honeypot).not.toBeNull();
    expect(honeypot.hasAttribute('hidden')).toBe(true);
    expect(honeypot.getAttribute('aria-hidden')).toBe('true');
    expect(honeypot.getAttribute('tabindex')).toBe('-1');
    expect(honeypot.getAttribute('autocomplete')).toBe('off');
    // A human never reaches it: it is out of the accessibility tree and of
    // the tab order.
    expect(screen.queryByRole('textbox', { name: /website/i })).toBeNull();
  });

  it('should send the honeypot value the form holds', async () => {
    renderModal();
    fillBinome();
    // A bot fills the hidden field: the value travels with the registration.
    fireEvent.change(honeypotInput(), { target: { value: 'https://spam.example' } });
    mocks.postRegistration.mockResolvedValueOnce({ status: 'bot' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.postRegistration).toHaveBeenCalledOnce());

    expect(mocks.postRegistration.mock.calls[0]?.[0]?.honeypot).toBe('https://spam.example');
  });

  it('should state the data retention of the names', () => {
    renderModal();
    const notice = screen.getByText(/fiches de suivi/).textContent ?? '';

    expect(notice).toContain("Vos noms servent à établir les fiches de suivi de l'action.");
    expect(notice).toContain('Les données sont effacées 90 jours après l');
  });
});

/**
 * The closed registration window (ticket #18): the modal announces that «
 * l'action est passée » and disables its whole form.
 */
describe('RegisterBinomeModal closed window', () => {
  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = CLOSED_STATUS;
  });

  it('should announce the closed window and disable the form', () => {
    renderModal();

    expect(screen.getByRole('alert').textContent).toContain("L'action est passée");
    expect(screen.getByRole('alert').textContent).toContain('les inscriptions sont closes');
    for (const input of identityInputs()) {
      expect(input.disabled).toBe(true);
    }
    expect((screen.getByRole('checkbox', { name: /engageons/ }) as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(submitButton().disabled).toBe(true);
  });

  it('should never post a registration while the window is closed', () => {
    renderModal();
    fillBinome();

    fireEvent.click(submitButton());
    expect(mocks.postRegistration).not.toHaveBeenCalled();
  });
});
