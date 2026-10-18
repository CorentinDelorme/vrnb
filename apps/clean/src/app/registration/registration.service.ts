import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of } from 'rxjs';
import {
  CoveredTour,
  RegistrationCreatedResponse,
  RegistrationErrorCode,
  RegistrationRequest,
  RegistrationStatusResponse,
} from './registration-contract';

/** Same-origin endpoint of the registration API (GET status, POST registration). */
export const REGISTRATION_STATUS_URL = '/api/inscriptions';

/** Failure codes exposed to the UI: the contract codes plus an unknown fallback. */
export type RegistrationFailureCode = RegistrationErrorCode | 'unknown';

/** Outcome of a registration attempt; never throws, so the modal only renders state. */
export type RegistrationResult =
  | { readonly status: 'success' }
  | {
      readonly status: 'error';
      readonly code: RegistrationFailureCode;
      readonly message: string;
    };

/** Error variant of {@link RegistrationResult}. */
export type RegistrationFailure = Extract<RegistrationResult, { readonly status: 'error' }>;

const GENERIC_ERROR_MESSAGE = 'Une erreur est survenue, merci de réessayer plus tard.';

const CONTRACT_ERROR_CODES: readonly RegistrationErrorCode[] = [
  'invalid_input',
  'captcha_failed',
  'closed',
  'already_registered',
  'server_error',
];

function isRegistrationErrorCode(value: unknown): value is RegistrationErrorCode {
  return CONTRACT_ERROR_CODES.includes(value as RegistrationErrorCode);
}

/** French copy shown to the volunteer; the server message is the fallback for unknown codes. */
export function registrationErrorMessage(
  code: RegistrationFailureCode,
  serverMessage: string | null,
): string {
  switch (code) {
    case 'already_registered':
      return "Ce parcours vient d'être réservé par un autre binôme.";
    case 'closed':
      return 'Les inscriptions sont closes.';
    case 'captcha_failed':
      return 'Captcha invalide, merci de réessayer.';
    case 'server_error':
      return GENERIC_ERROR_MESSAGE;
    case 'invalid_input':
      return serverMessage ?? 'Saisie invalide, merci de vérifier les champs.';
    case 'unknown':
      return serverMessage ?? GENERIC_ERROR_MESSAGE;
  }
}

function errorCodeFromBody(body: unknown): RegistrationErrorCode | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return null;
  }
  const code = (body as { readonly error: unknown }).error;
  return isRegistrationErrorCode(code) ? code : null;
}

function errorMessageFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return null;
  }
  const message = (body as { readonly message: unknown }).message;
  return typeof message === 'string' && message.length > 0 ? message : null;
}

function labelKey(zoneId: string, tourName: string): string {
  return `${zoneId}\u0000${tourName}`;
}

/**
 * HTTP client of the registration API, the single seam between the app and the
 * serverless functions. Exposes signal state so the home page and the modal react
 * to covered tours without any component knowing about the wire format.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  private readonly coveredToursState = signal<readonly CoveredTour[]>([]);
  private readonly statusLoadedState = signal(false);
  private readonly turnstileSiteKeyState = signal('');
  private readonly coveredKeys = computed(
    () => new Set(this.coveredToursState().map((tour) => labelKey(tour.zoneId, tour.tourName))),
  );
  private statusPending = false;

  /** Public status of the current edition; empty until the first successful load. */
  readonly coveredTours: Signal<readonly CoveredTour[]> = this.coveredToursState.asReadonly();
  /** True once the public status was successfully loaded; a failure keeps it unknown. */
  readonly statusLoaded: Signal<boolean> = this.statusLoadedState.asReadonly();
  /** Public Turnstile site key; empty string when the captcha is not configured. */
  readonly turnstileSiteKey: Signal<string> = this.turnstileSiteKeyState.asReadonly();

  /**
   * Loads the public status; a no-op once it is loaded or while a request is in
   * flight. A failed attempt leaves the state unknown, so the next call (next
   * visit to the page) re-issues the request.
   */
  loadStatus(): void {
    if (this.statusPending || this.statusLoadedState()) {
      return;
    }
    this.refreshStatus();
  }

  /** Reloads the public status; a failure keeps the current state and only warns. */
  refreshStatus(): void {
    this.statusPending = true;
    this.http
      .get<RegistrationStatusResponse>(REGISTRATION_STATUS_URL)
      .pipe(
        finalize(() => {
          this.statusPending = false;
        }),
      )
      .subscribe({
        next: (status) => {
          this.coveredToursState.set(status.coveredTours);
          this.turnstileSiteKeyState.set(status.turnstileSiteKey);
          this.statusLoadedState.set(true);
        },
        error: (error: HttpErrorResponse) => {
          console.warn('Unable to load the registration status.', error);
        },
      });
  }

  /** Whether a tour is already covered by a binome for the current edition. */
  isCovered(zoneId: string, tourName: string): boolean {
    return this.coveredKeys().has(labelKey(zoneId, tourName));
  }

  /**
   * Registers the binome. A 201 marks the tour covered right away so the badge
   * appears and the register button disappears without waiting for a refresh;
   * a 409 proves the tour is covered too, and reloads the public status.
   */
  register(request: RegistrationRequest): Observable<RegistrationResult> {
    return this.http.post<RegistrationCreatedResponse>(REGISTRATION_STATUS_URL, request).pipe(
      map(() => {
        this.markCovered(request.zoneId, request.tourName);
        return { status: 'success' } as const;
      }),
      catchError((error: HttpErrorResponse) => {
        const result = this.failureFromResponse(error);
        if (result.code === 'already_registered') {
          this.markCovered(request.zoneId, request.tourName);
          this.refreshStatus();
        }
        return of(result);
      }),
    );
  }

  private markCovered(zoneId: string, tourName: string): void {
    if (this.isCovered(zoneId, tourName)) {
      return;
    }
    this.coveredToursState.update((tours) => [...tours, { zoneId, tourName }]);
  }

  private failureFromResponse(error: HttpErrorResponse): RegistrationFailure {
    const code = errorCodeFromBody(error.error) ?? this.codeFromStatus(error.status);
    return {
      status: 'error',
      code,
      message: registrationErrorMessage(code, errorMessageFromBody(error.error)),
    };
  }

  private codeFromStatus(status: number): RegistrationFailureCode {
    switch (status) {
      case 0:
        // Network failure: the request never reached the API.
        return 'server_error';
      case 400:
        return 'invalid_input';
      case 409:
        return 'already_registered';
      default:
        return status >= 500 ? 'server_error' : 'unknown';
    }
  }
}
