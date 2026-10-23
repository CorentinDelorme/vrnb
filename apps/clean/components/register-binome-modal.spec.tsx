import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RegistrationOutcome } from '../src/app/inscriptions/inscriptions-client';
import type { BinomeRegistration } from '../src/app/inscriptions/validation';
import type { TourRef } from '../src/app/tours-queries';
import type { InscriptionsStatus } from './inscriptions-status-provider';
import { RegisterBinomeModal } from './register-binome-modal';

/**
 * Behavior of the DaisyUI registration modal (tickets #17 + #18): the submit
 * stays gated on the four identity fields plus the engagement statement, a
 * created outcome posts the exact contract body, shows the confirmation and
 * reloads the statuses; a 409 shows the covered-meantime guard and reloads
 * too; each refusal (invalid saisie, closed window) and the network failures
 * show their own explicit message without reloading. No submit resets the
 * fields — a close without submitting keeps the values.
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
  fetchInscriptionsOutcome: async () => ({ status: 'error' }) as const,
  postRegistration: mocks.postRegistration,
}));

// The real module is kept (only the hooks are mocked): the modal reads the
// registration window through the shared rule of the provider.
vi.mock('./inscriptions-status-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./inscriptions-status-provider')>()),
  useInscriptionsReload: () => mocks.reload,
  useInscriptionsStatus: () => status.current as InscriptionsStatus,
}));

/** The public state of an open registration window. */
const OPEN_STATUS: InscriptionsStatus = {
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
};

/** The public state of a closed registration window (the action date is past). */
const CLOSED_STATUS: InscriptionsStatus = {
  state: {
    edition: {
      actionDate: '2027-02-14',
      actionEndTime: '12:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2027-01-04',
      year: 2027,
    },
    inscriptions: [],
    registrationOpen: false,
  },
  status: 'success',
};

/**
 * A post-closure instant of the Édition (2027-02-12 = 2 days before the
 * action): a window the server answers closed then really is closed, both
 * for the server answer and for the local clock fallback.
 */
const POST_CLOSURE_CLOCK = new Date('2027-02-12T09:00:00Z');

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

/** Render the modal open at a given instant (the local clock fallback). */
function renderModalAt(now: Date) {
  const onClose = vi.fn();
  installDialogueStub(onClose);
  const render_ = render(<RegisterBinomeModal now={now} onClose={onClose} tour={TOUR} visible />);
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
  fireEvent.click(screen.getByRole('checkbox', { name: /confirmons notre participation/ }));
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

  it('should show the tour context: Zone, Parcours, action day, meeting point', () => {
    renderModal();
    const context = screen.getByText(/Zone/).textContent ?? '';
    // The Zone comes first, then the Parcours: « Zone Bruz Sud — Parcours V1 ».
    expect(context).toContain('Bruz Sud');
    expect(context).toContain('V1');
    expect(context.indexOf('Bruz Sud')).toBeLessThan(context.indexOf('V1'));
    expect(screen.getByText(/Jour de l'action/).textContent).toContain('14 février 2027');
    expect(screen.getAllByText(/Point de rendez-vous/).length).toBeGreaterThan(0);
    // The meeting point is named without repeating the Zone.
    expect(screen.getByText(/Point de rendez-vous/).textContent).toContain('Place du Dr Joly');
    expect(screen.getByText(/Point de rendez-vous/).textContent).not.toContain('Bruz Sud');
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
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmons notre participation/ }));
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

  it('should show the standard invalid feedback on a 400, without revealing the honeypot', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'invalid' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Saisie invalide'));

    expect(screen.getByRole('alert').textContent).toMatch(/Saisie invalide/);
    // The anti-bot honeypot is refused silently: the message never names it.
    expect(screen.getByRole('alert').textContent).not.toMatch(/anti-robots/i);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it('should show the distinct closed-window feedback on a closed window answer', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'closed' });

    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Les inscriptions sont closes'),
    );

    expect(screen.getByRole('alert').textContent).toMatch(/3 jours avant la date de l'action/);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it('should show the distinct not-open feedback on a not-open answer', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'not-open' });

    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Les inscriptions ouvriront le lundi 4 janvier 2027',
      ),
    );

    expect(screen.getByRole('alert').textContent).toMatch(/Les inscriptions ouvriront le/);
    expect(screen.getByRole('alert').textContent).not.toMatch(/closes/);
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
    mocks.postRegistration.mockResolvedValueOnce({ status: 'invalid' });

    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.postRegistration).toHaveBeenCalledOnce());

    expect(mocks.postRegistration.mock.calls[0]?.[0]?.honeypot).toBe('https://spam.example');
  });

  it('should state the data retention of the names', () => {
    renderModal();
    const notice = screen.getByText(/fiches de suivi/).textContent ?? '';

    expect(notice).toContain("Vos informations servent à établir les fiches de suivi de l'action.");
    expect(notice).toContain('Les données sont effacées 90 jours après l');
  });
});

/**
 * The closed registration window: after the closing bound (3 days before the
 * action), the modal announces that the window is closed and disables its
 * whole form. The clock is injected (post-closure instant) so the render does
 * not depend on the wall clock of the runner.
 */
describe('RegisterBinomeModal closed window', () => {
  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = CLOSED_STATUS;
  });

  it('should announce the closed window and disable the form', () => {
    renderModalAt(POST_CLOSURE_CLOCK);

    expect(screen.getByRole('alert').textContent).toContain('Les inscriptions sont closes');
    expect(screen.getByRole('alert').textContent).toContain("3 jours avant la date de l'action");
    for (const input of identityInputs()) {
      expect(input.disabled).toBe(true);
    }
    expect(
      (screen.getByRole('checkbox', { name: /confirmons notre participation/ }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(submitButton().disabled).toBe(true);
  });

  it('should never post a registration while the window is closed', () => {
    renderModalAt(POST_CLOSURE_CLOCK);
    fillBinome();

    fireEvent.click(submitButton());
    expect(mocks.postRegistration).not.toHaveBeenCalled();
  });
});

/**
 * The not-open-yet registration window (spec #32): before the opening bound
 * of the Édition, the modal announces the opening date in letters and
 * disables its whole form, distinguishing itself from the closed-window
 * message — whether the public state is loaded (the server answers a closed
 * window while the inscriptions are not open yet — the state of the site at
 * publication) or falls back on the local clock.
 */
describe('RegisterBinomeModal not-open-yet window', () => {
  /** An instant before the opening day of the Édition (2027-01-04). */
  const BEFORE_OPENING_CLOCK = new Date('2027-01-02T09:00:00Z');

  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = { status: 'loading' };
  });

  it('should announce the opening date in letters and disable the form', () => {
    renderModalAt(BEFORE_OPENING_CLOCK);

    expect(screen.getByRole('alert').textContent).toContain(
      'Les inscriptions ouvriront le lundi 4 janvier 2027',
    );
    expect(screen.queryByText(/Les inscriptions sont closes/)).toBeNull();
    for (const input of identityInputs()) {
      expect(input.disabled).toBe(true);
    }
    expect(
      (screen.getByRole('checkbox', { name: /confirmons notre participation/ }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(submitButton().disabled).toBe(true);
  });

  it('should announce the opening date on a public state the server answers closed before opening', () => {
    // The server answers registrationOpen=false (the site state at
    // publication): the local clock of the modal tells the two bounds apart.
    status.current = CLOSED_STATUS;
    renderModalAt(BEFORE_OPENING_CLOCK);

    expect(screen.getByRole('alert').textContent).toContain(
      'Les inscriptions ouvriront le lundi 4 janvier 2027',
    );
    expect(submitButton().disabled).toBe(true);
  });

  it('should announce the opening date of the Édition the public state carries', () => {
    // A loaded state whose Édition differs from the bundled one: the
    // announcement quotes the date THE STATE ANSWERED (the same source rule
    // as the home announcement), never the bundled fallback.
    const laterEdition = {
      actionDate: '2028-06-18',
      actionEndTime: '17:00',
      actionStartTime: '09:00',
      inscriptionsOpenDate: '2028-04-03',
      year: 2028,
    } as const;
    status.current = {
      state: { edition: laterEdition, inscriptions: [], registrationOpen: false },
      status: 'success',
    };
    renderModalAt(new Date('2028-03-15T09:00:00Z'));

    expect(screen.getByRole('alert').textContent).toContain(
      'Les inscriptions ouvriront le lundi 3 avril 2028.',
    );
    expect(screen.getByRole('alert').textContent).not.toContain('2027');
    expect(submitButton().disabled).toBe(true);
  });

  it('should never post a registration while the window is not open yet', () => {
    renderModalAt(BEFORE_OPENING_CLOCK);
    fillBinome();

    fireEvent.click(submitButton());
    expect(mocks.postRegistration).not.toHaveBeenCalled();
  });
});

/**
 * The local clock fallback of the modal: when the public state could not be
 * loaded, the modal falls back on its own clock to know whether the window is
 * open. The clock is injected, so the test does not depend on the wall clock
 * of the runner.
 */
describe('RegisterBinomeModal local clock fallback', () => {
  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = { status: 'error' };
  });

  it('should close the window on its own clock when the public state failed', () => {
    renderModalAt(new Date('2027-02-12T09:00:00Z'));

    expect(screen.getByRole('alert').textContent).toContain('Les inscriptions sont closes');
    expect(submitButton().disabled).toBe(true);
  });

  it('should announce the opening date on its own clock when it predates the opening', () => {
    renderModalAt(new Date('2026-12-01T09:00:00Z'));

    expect(screen.getByRole('alert').textContent).toContain(
      'Les inscriptions ouvriront le lundi 4 janvier 2027',
    );
    expect(submitButton().disabled).toBe(true);
  });

  it('should keep the window open on its own clock on the last registration day', () => {
    renderModalAt(new Date('2027-02-11T09:00:00Z'));

    expect(screen.queryByText(/Les inscriptions sont closes/)).toBeNull();
    expect(identityInputs()[0]?.disabled).toBe(false);
  });
});

/**
 * The confirmation panel (ticket #36): once the registration is created, the
 * panel becomes a meeting point — it asks to note the zone and the Parcours
 * name, recalls the action hours from the Édition config around the action
 * date, keeps naming the Point de rendez-vous, and offers the two agenda
 * links (Google Calendar in a new tab, the .ics file served by the calendar
 * route). Both links exist ONLY on this state, never outside the
 * confirmation.
 */
describe('RegisterBinomeModal confirmation with calendar links', () => {
  /** Fill + submit a valid form, then wait until the confirmation shows. */
  async function renderConfirmation(): Promise<void> {
    renderModal();
    fillBinome();
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Votre binôme est inscrit'),
    );
  }

  beforeEach(() => {
    mocks.postRegistration.mockReset().mockResolvedValue({ status: 'created' });
    mocks.reload.mockReset();
    status.current = OPEN_STATUS;
  });

  it('should recall the day with its hours, the note sentence and the meeting point', async () => {
    await renderConfirmation();

    // The hours come from the Édition config (09:00 → 9h, 12:00 → 12h) and
    // wrap the action date, exactly like the calendar description words it.
    expect(screen.getByRole('alert').textContent).toContain(
      'le dimanche 14 février 2027 de 9h à 12h',
    );
    // The note-to-take sentence carries the data, never a literal.
    const note = screen.getByText(/Notez la zone et le nom du parcours/).textContent ?? '';
    expect(note).toContain("pour le jour de l'action");
    expect(note).toContain('Bruz Sud — V1.');
    // The Point de rendez-vous stays named on the confirmation.
    expect(screen.getByText(/Point de rendez-vous/).textContent).toContain('Place du Dr Joly');
  });

  it('should offer the two agenda links on the confirmation', async () => {
    await renderConfirmation();

    // Google Calendar: a plausible template link built by the pure module,
    // carrying the Zone and the Parcours, opened in a new tab.
    const google = screen.getByRole('link', { name: 'Google Agenda' }) as HTMLAnchorElement;
    expect(google.href.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const googleUrl = new URL(google.href);
    expect(googleUrl.searchParams.get('action')).toBe('TEMPLATE');
    expect(googleUrl.searchParams.get('text')).toBe('Ramassage VRNB — Bruz Sud (V1)');
    expect(googleUrl.searchParams.get('location')).toBe(
      'Point de rendez-vous\u00a0: Place du Dr Joly',
    );
    expect(google.target).toBe('_blank');
    expect(google.rel).toContain('noopener');

    // The .ics file points to the calendar route of the exact couple, with
    // no .ics suffix in the URL (the filename arrives through the header).
    const ics = screen.getByRole('link', { name: 'Fichier calendrier (.ics)' });
    expect(ics.getAttribute('href')).toBe('/api/calendrier/bruz-sud/V1');
  });

  it('should show no calendar link nor note before the submission', () => {
    renderModal();

    expect(screen.queryByRole('link', { name: 'Google Agenda' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Fichier calendrier (.ics)' })).toBeNull();
    expect(screen.queryByText(/Notez la zone et le nom du parcours/)).toBeNull();
  });

  it('should show no calendar link on a refusal', async () => {
    renderModal();
    fillBinome();
    mocks.postRegistration.mockResolvedValueOnce({ status: 'taken' });
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('couvert'));

    expect(screen.queryByRole('link', { name: 'Google Agenda' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Fichier calendrier (.ics)' })).toBeNull();
    expect(screen.queryByText(/Notez la zone et le nom du parcours/)).toBeNull();
  });
});
