import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CancelIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { map, startWith } from 'rxjs';
import { Tour } from '../tours-service';
import { Zone } from '../zones';
import { ACTION_EDITION, formatActionDate, isRegistrationOpen } from './registration-config';
import { IDENTITY_FIELD_MAX_LENGTH } from './registration-contract';
import { RegistrationService } from './registration.service';
import { TurnstileWidget } from './turnstile-widget';

const CLOSED_MESSAGE = "L'action est passée.";
const SUCCESS_MESSAGE = 'Votre binôme est inscrit.';

/** Required validator that rejects values made only of whitespace. */
function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

/**
 * Binome registration dialog of one tour, opened from the home page.
 *
 * A single instance lives in `ToursList`: `open` binds the tour context, computes
 * the registration window and shows the native dialog; the service owns every
 * piece of server state, the modal only renders it.
 */
@Component({
  selector: 'app-registration-modal',
  standalone: true,
  imports: [ReactiveFormsModule, HugeiconsIconComponent, TurnstileWidget],
  templateUrl: './registration-modal.html',
})
export class RegistrationModal {
  protected readonly registration = inject(RegistrationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly turnstile = viewChild(TurnstileWidget);

  private readonly zoneState = signal<Zone | null>(null);
  private readonly tourState = signal<Tour | null>(null);

  readonly zone = this.zoneState.asReadonly();
  readonly tour = this.tourState.asReadonly();
  /** True while the dialog is open; drives the Turnstile challenge. */
  readonly visible = signal(false);
  /** True when the action date is past: the dialog stays readable but inert. */
  readonly closed = signal(false);
  readonly submitting = signal(false);
  readonly confirmed = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly actionDate = formatActionDate(ACTION_EDITION);
  readonly identityMaxLength = IDENTITY_FIELD_MAX_LENGTH;
  readonly closedMessage = CLOSED_MESSAGE;
  readonly successMessage = SUCCESS_MESSAGE;
  readonly cancelIcon = CancelIcon;
  readonly successIcon = CheckmarkCircle02Icon;

  readonly form = this.formBuilder.group({
    firstName1: ['', [trimmedRequired, Validators.maxLength(IDENTITY_FIELD_MAX_LENGTH)]],
    lastName1: ['', [trimmedRequired, Validators.maxLength(IDENTITY_FIELD_MAX_LENGTH)]],
    firstName2: ['', [trimmedRequired, Validators.maxLength(IDENTITY_FIELD_MAX_LENGTH)]],
    lastName2: ['', [trimmedRequired, Validators.maxLength(IDENTITY_FIELD_MAX_LENGTH)]],
    commitment: [false, Validators.requiredTrue],
    captchaToken: ['', Validators.required],
  });

  private readonly formValid = toSignal(
    this.form.statusChanges.pipe(
      startWith(this.form.status),
      map(() => this.form.valid),
    ),
    { initialValue: false },
  );

  readonly submitDisabled = computed(
    () => this.closed() || this.submitting() || this.confirmed() || !this.formValid(),
  );

  /** The captcha is only needed while the registration window is open. */
  protected readonly widgetActive = computed(
    () => this.visible() && !this.confirmed() && !this.closed(),
  );

  /** Opens the dialog for one tour of one zone. */
  open(zone: Zone, tour: Tour): void {
    this.zoneState.set(zone);
    this.tourState.set(tour);
    this.resetState();
    // A widget that survived a previous close must restart its challenge: the
    // state reset above dropped its token and a solved widget emits no new one.
    this.turnstile()?.reset();
    const closed = !isRegistrationOpen(ACTION_EDITION, new Date());
    this.closed.set(closed);
    if (closed) {
      this.form.disable();
    } else {
      this.form.enable();
    }
    this.visible.set(true);
    this.dialogRef().nativeElement.showModal();
  }

  /** Closes the dialog; the native close event resets the transient state. */
  close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected handleClosed(): void {
    this.visible.set(false);
    this.resetState();
  }

  protected handleToken(token: string): void {
    this.form.controls.captchaToken.setValue(token);
  }

  protected fieldError(name: 'firstName1' | 'lastName1' | 'firstName2' | 'lastName2'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    const zone = this.zoneState();
    const tour = this.tourState();
    if (!zone || !tour || this.submitDisabled()) {
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.registration
      .register({
        zoneId: zone.id,
        tourName: tour.name,
        firstName1: value.firstName1.trim(),
        lastName1: value.lastName1.trim(),
        firstName2: value.firstName2.trim(),
        lastName2: value.lastName2.trim(),
        commitment: value.commitment,
        captchaToken: value.captchaToken,
      })
      .subscribe((result) => {
        this.submitting.set(false);
        if (result.status === 'success') {
          this.form.reset();
          this.confirmed.set(true);
          return;
        }
        // The captcha token is cleared: a rejected token cannot be submitted twice.
        this.form.controls.captchaToken.reset('');
        this.turnstile()?.reset();
        this.errorMessage.set(result.message);
      });
  }

  private resetState(): void {
    this.form.reset();
    this.submitting.set(false);
    this.confirmed.set(false);
    this.errorMessage.set(null);
  }
}
