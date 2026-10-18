import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tour } from '../tours-service';
import { Zone } from '../zones';
import { RegistrationModal } from './registration-modal';
import { RegistrationService } from './registration.service';
import { TurnstileRenderOptions } from './turnstile-widget';

const ZONE: Zone = {
  id: 'bruz-sud',
  name: 'Bruz Sud',
  meetingPoint: { name: 'Place du Dr Joly', coordinates: [-1.747083, 48.024417] },
};

const TOUR: Tour = {
  name: 'V2',
  distance: 2.2,
  startDistance: 0,
  endDistance: 2.2,
  zoneId: 'bruz-sud',
};

const IDENTITY = {
  firstName1: 'Alice',
  lastName1: 'Martin',
  firstName2: 'Bruno',
  lastName2: 'Petit',
};

/** jsdom does not implement the native dialog API yet; emulate showModal/close. */
beforeAll(() => {
  const prototype = HTMLDialogElement.prototype;
  prototype.showModal ??= function (this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  prototype.close ??= function (this: HTMLDialogElement): void {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('RegistrationModal', () => {
  let fixture: ComponentFixture<RegistrationModal>;
  let modal: RegistrationModal;
  let httpTesting: HttpTestingController;
  let registration: RegistrationService;
  let renderedOptions: TurnstileRenderOptions | null;
  let render: ReturnType<
    typeof vi.fn<(container: HTMLElement, options: TurnstileRenderOptions) => string>
  >;
  let reset: ReturnType<typeof vi.fn<(widgetId?: string) => void>>;

  beforeEach(async () => {
    renderedOptions = null;
    render = vi.fn((_container: HTMLElement, options: TurnstileRenderOptions): string => {
      renderedOptions = options;
      return 'widget-1';
    });
    reset = vi.fn((): void => undefined);
    window.turnstile = { render, reset };

    await TestBed.configureTestingModule({
      imports: [RegistrationModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(RegistrationModal);
    modal = fixture.componentInstance;
    registration = TestBed.inject(RegistrationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    delete window.turnstile;
    vi.useRealTimers();
    httpTesting.verify();
  });

  const element = <T extends Element>(selector: string): T => {
    const found = (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
    if (!found) {
      throw new Error(`Missing element ${selector}`);
    }
    return found;
  };

  const dialogText = (): string => fixture.nativeElement.textContent;

  const submitButton = (): HTMLButtonElement => element<HTMLButtonElement>('#registration-submit');

  const field = (name: string): HTMLInputElement =>
    element<HTMLInputElement>(`#registration-${name}`);

  const writeField = (name: string, value: string): void => {
    const input = field(name);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const checkCommitment = (): void => {
    const checkbox = element<HTMLInputElement>('#registration-commitment');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
  };

  const loadStatus = (siteKey = 'turnstile-site-key'): void => {
    registration.loadStatus();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush({ year: 2027, coveredTours: [], turnstileSiteKey: siteKey });
  };

  const openModal = (): void => {
    modal.open(ZONE, TOUR);
    fixture.detectChanges();
  };

  const openReadyModal = (): void => {
    loadStatus();
    openModal();
  };

  const fillForm = (identity = IDENTITY): void => {
    writeField('first-name-1', identity.firstName1);
    writeField('last-name-1', identity.lastName1);
    writeField('first-name-2', identity.firstName2);
    writeField('last-name-2', identity.lastName2);
    checkCommitment();
    fixture.detectChanges();
  };

  const solveCaptcha = (): void => {
    renderedOptions?.callback('captcha-token');
    fixture.detectChanges();
  };

  const submitForm = (): void => {
    element<HTMLFormElement>('#registration-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it('opens the dialog with the tour context, the action date and the meeting point', () => {
    openReadyModal();

    expect(element<HTMLDialogElement>('dialog').hasAttribute('open')).toBe(true);
    expect(dialogText()).toContain('V2');
    expect(dialogText()).toContain('Bruz Sud');
    expect(dialogText()).toContain('dimanche 14 février 2027');
    expect(dialogText()).toContain('Place du Dr Joly');
  });

  it('shows the commitment checkbox and the RGPD mention', () => {
    openReadyModal();

    expect(dialogText()).toContain(
      "Je confirme que notre binôme participera à l'action de ramassage des déchets.",
    );
    expect(dialogText()).toContain(
      "Vos prénoms et noms servent uniquement à l'organisation de l'action (fiches de suivi) " +
        "et sont effacés en début d'année suivante. Aucune donnée n'est publiée sur le site.",
    );
  });

  it('enables the submit button only with a valid form, the commitment and a captcha token', () => {
    openReadyModal();
    expect(submitButton().disabled).toBe(true);

    fillForm();
    expect(submitButton().disabled).toBe(true);

    solveCaptcha();
    expect(submitButton().disabled).toBe(false);
  });

  it('rejects a blank identity field after trimming', () => {
    openReadyModal();

    fillForm({ ...IDENTITY, firstName1: '   ' });
    solveCaptcha();

    expect(submitButton().disabled).toBe(true);
  });

  it('shows the closed state and disables the form after the action date', () => {
    vi.useFakeTimers({ now: new Date('2027-03-01T12:00:00Z') });
    openReadyModal();

    expect(dialogText()).toContain("L'action est passée.");
    expect(submitButton().disabled).toBe(true);
    expect(field('first-name-1').disabled).toBe(true);
    expect(render).not.toHaveBeenCalled();
  });

  it('explains the pending captcha and the unchecked commitment checkbox', () => {
    openReadyModal();

    expect(dialogText()).toContain('Complétez le captcha pour poursuivre.');
    expect(dialogText()).not.toContain('Merci de cocher cette case.');

    // Checking then unchecking marks the checkbox dirty: the missing commitment is explained.
    checkCommitment();
    const checkbox = field('commitment');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(dialogText()).toContain('Merci de cocher cette case.');

    checkCommitment();
    fixture.detectChanges();
    expect(dialogText()).not.toContain('Merci de cocher cette case.');

    solveCaptcha();
    expect(dialogText()).not.toContain('Complétez le captcha pour poursuivre.');
  });

  it('posts the trimmed identity, shows a submitting state and confirms the registration', () => {
    openReadyModal();
    fillForm({ ...IDENTITY, firstName1: '  Alice  ', lastName1: ' Martin ' });
    solveCaptcha();

    submitForm();
    expect(modal.submitting()).toBe(true);
    expect(submitButton().disabled).toBe(true);

    const request = httpTesting.expectOne('/api/inscriptions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      zoneId: 'bruz-sud',
      tourName: 'V2',
      ...IDENTITY,
      commitment: true,
      captchaToken: 'captcha-token',
    });
    request.flush(
      { year: 2027, zoneId: 'bruz-sud', tourName: 'V2' },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(modal.submitting()).toBe(false);
    expect(modal.confirmed()).toBe(true);
    expect(dialogText()).toContain('Votre binôme est inscrit.');
    expect(registration.isCovered('bruz-sud', 'V2')).toBe(true);
  });

  it('shows the concurrent registration error inline and refreshes the covered tours', () => {
    openReadyModal();
    fillForm();
    solveCaptcha();

    submitForm();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'already_registered', message: 'Déjà réservé.' },
        { status: 409, statusText: 'Conflict' },
      );
    httpTesting.expectOne('/api/inscriptions').flush({
      year: 2027,
      coveredTours: [{ zoneId: 'bruz-sud', tourName: 'V2' }],
      turnstileSiteKey: 'turnstile-site-key',
    });
    fixture.detectChanges();

    expect(dialogText()).toContain("Ce parcours vient d'être réservé par un autre binôme.");
    expect(modal.confirmed()).toBe(false);
    expect(submitButton().disabled).toBe(true);
    expect(registration.isCovered('bruz-sud', 'V2')).toBe(true);
  });

  it('shows the captcha error returned by the server', () => {
    openReadyModal();
    fillForm();
    solveCaptcha();

    submitForm();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'captcha_failed', message: 'Captcha refusé.' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(dialogText()).toContain('Captcha invalide, merci de réessayer.');
    expect(modal.confirmed()).toBe(false);
  });

  it('clears the dialog state when it is closed', () => {
    openReadyModal();
    fillForm();

    modal.close();
    fixture.detectChanges();

    expect(element<HTMLDialogElement>('dialog').hasAttribute('open')).toBe(false);
    expect(field('first-name-1').value).toBe('');
  });

  it('reopens with a fresh captcha challenge after a close', () => {
    openReadyModal();
    fillForm();
    // Managed flow: the challenge also resolves while the dialog is hidden.
    reset.mockImplementation(() => renderedOptions?.callback('captcha-token'));

    modal.close();
    fixture.detectChanges();
    expect(element<HTMLDialogElement>('dialog').hasAttribute('open')).toBe(false);

    openModal();
    fillForm();

    expect(submitButton().disabled).toBe(false);
  });

  it('keeps the confirmation when the modal was opened through the request input', async () => {
    loadStatus();
    fixture.componentRef.setInput('request', { zone: ZONE, tour: TOUR });
    fixture.detectChanges();
    expect(element<HTMLDialogElement>('dialog').hasAttribute('open')).toBe(true);

    fillForm();
    solveCaptcha();
    submitForm();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { year: 2027, zoneId: 'bruz-sud', tourName: 'V2' },
        { status: 201, statusText: 'Created' },
      );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Removing the widget after the success must not reopen the modal and wipe
    // the confirmation: only the request input drives the open effect.
    expect(modal.confirmed()).toBe(true);
    expect(dialogText()).toContain('Votre binôme est inscrit.');
  });
});
