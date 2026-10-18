import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RegistrationRequest, RegistrationStatusResponse } from './registration-contract';
import { RegistrationResult, RegistrationService } from './registration.service';

const STATUS: RegistrationStatusResponse = {
  year: 2027,
  coveredTours: [{ zoneId: 'bruz-sud', tourName: 'V1' }],
  turnstileSiteKey: 'turnstile-site-key',
};

const REQUEST: RegistrationRequest = {
  zoneId: 'bruz-sud',
  tourName: 'V2',
  firstName1: 'Alice',
  lastName1: 'Martin',
  firstName2: 'Bruno',
  lastName2: 'Petit',
  commitment: true,
  captchaToken: 'captcha-token',
};

describe('RegistrationService', () => {
  let service: RegistrationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RegistrationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  const post = (request: RegistrationRequest = REQUEST) =>
    firstValueFrom(service.register(request));

  const flushStatus = (status: RegistrationStatusResponse = STATUS) =>
    httpTesting.expectOne('/api/inscriptions').flush(status);

  it('starts with an unknown status and no covered tour', () => {
    expect(service.statusLoaded()).toBe(false);
    expect(service.coveredTours()).toEqual([]);
    expect(service.turnstileSiteKey()).toBe('');
    expect(service.isCovered('bruz-sud', 'V1')).toBe(false);
  });

  it('exposes the covered tours, the site key and covered lookups after loading the status', () => {
    service.loadStatus();
    const request = httpTesting.expectOne('/api/inscriptions');
    expect(request.request.method).toBe('GET');
    request.flush(STATUS);

    expect(service.statusLoaded()).toBe(true);
    expect(service.coveredTours()).toEqual([{ zoneId: 'bruz-sud', tourName: 'V1' }]);
    expect(service.turnstileSiteKey()).toBe('turnstile-site-key');
    expect(service.isCovered('bruz-sud', 'V1')).toBe(true);
    expect(service.isCovered('bruz-sud', 'V2')).toBe(false);
    expect(service.isCovered('bruz-vau-gaillard', 'V1')).toBe(false);
  });

  it('loads the status only once', () => {
    service.loadStatus();
    service.loadStatus();
    // `verify` in afterEach fails if the second call issued a duplicate GET.
    flushStatus();
    expect(service.statusLoaded()).toBe(true);
  });

  it('re-issues the status request after a failed load', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    service.loadStatus();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(service.statusLoaded()).toBe(false);

    service.loadStatus();
    flushStatus();

    expect(service.statusLoaded()).toBe(true);
    warn.mockRestore();
  });

  it('keeps the status unknown and warns when the status request fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    service.loadStatus();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.statusLoaded()).toBe(false);
    expect(service.isCovered('bruz-sud', 'V1')).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('marks the tour covered right after a successful registration', async () => {
    const result = post();
    const request = httpTesting.expectOne('/api/inscriptions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(REQUEST);
    request.flush(
      { year: 2027, zoneId: 'bruz-sud', tourName: 'V2' },
      { status: 201, statusText: 'Created' },
    );

    expect(await result).toEqual({ status: 'success' });
    expect(service.isCovered('bruz-sud', 'V2')).toBe(true);
    expect(service.coveredTours()).toContainEqual({ zoneId: 'bruz-sud', tourName: 'V2' });
  });

  it('maps a 409 to the already reserved message and refreshes the status', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'already_registered', message: 'Déjà réservé.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'already_registered',
      message: "Ce parcours vient d'être réservé par un autre binôme.",
    });
    expect(service.isCovered('bruz-sud', 'V2')).toBe(true);
    flushStatus();
  });

  it('maps a closed registration window to its message', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'closed', message: "L'action est passée." },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'closed',
      message: 'Les inscriptions sont closes.',
    });
  });

  it('maps a rejected captcha to its message', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'captcha_failed', message: 'Captcha refusé.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'captcha_failed',
      message: 'Captcha invalide, merci de réessayer.',
    });
  });

  it('maps a 500 to the generic message', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'server_error', message: 'Erreur inattendue.' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    });
  });

  it('keeps the server validation message for invalid input', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'invalid_input', message: 'Le prénom est obligatoire.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'invalid_input',
      message: 'Le prénom est obligatoire.',
    });
  });

  it('falls back to the server message for an unknown error code', async () => {
    const result = post();
    httpTesting
      .expectOne('/api/inscriptions')
      .flush(
        { error: 'teapot', message: 'Je suis une théière.' },
        { status: 418, statusText: "I'm a teapot" },
      );

    expect(await result).toEqual({
      status: 'error',
      code: 'unknown',
      message: 'Je suis une théière.',
    });
  });

  it('maps a network failure to a typed generic error without throwing', async () => {
    const result = post();
    httpTesting.expectOne('/api/inscriptions').error(new ProgressEvent('error'));

    const expected: RegistrationResult = {
      status: 'error',
      code: 'server_error',
      message: 'Une erreur est survenue, merci de réessayer plus tard.',
    };
    expect(await result).toEqual(expected);
  });
});
