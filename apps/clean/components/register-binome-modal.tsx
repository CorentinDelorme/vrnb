'use client';

import { CalendarDaysIcon, CancelIcon, Location01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';

import { CURRENT_EDITION, EDITION_TIME_ZONE } from '../src/app/inscriptions/edition';
import type { BinomeRegistration } from '../src/app/inscriptions/inscriptions-client';
import { postRegistration } from '../src/app/inscriptions/inscriptions-client';
import type { TourRef } from '../src/app/tours-queries';
import { getZone } from '../src/app/zones';
import { useInscriptionsReload } from './inscriptions-status-provider';

/**
 * DaisyUI registration modal of one Parcours (ticket #17): it shows the
 * selected tour context — Parcours name, Zone, action date and the Zone
 * meeting point — and collects the two Binôme identities plus the required
 * engagement statement. `showModal()` is called by effect when the host makes
 * it visible, and the dialog answers its native `close` event (X button,
 * backdrop, Escape) by telling the host it closed.
 *
 * Submitting posts the registration and degrades on every outcome: created →
 * confirmation + statuses reload, taken (covered meanwhile) → last-resort
 * guard + statuses reload, invalid / network error → basic French feedback
 * (per-status detailed messaging is ticket #18). The identity inputs keep
 * their values over close/reopen — the host keeps this component mounted and
 * only toggles `visible` — while nothing resets except a fresh mount.
 */

/** The four identity fields of the Binôme form, as controlled inputs. */
interface BinomeFormValues {
  readonly firstName1: string;
  readonly firstName2: string;
  readonly lastName1: string;
  readonly lastName2: string;
}

/** Lifecycle of a registration inside the modal (idle → submitting → outcome). */
type ModalOutcome = 'idle' | 'submitting' | 'created' | 'taken' | 'invalid' | 'error';

const EMPTY_BINOME: BinomeFormValues = {
  firstName1: '',
  firstName2: '',
  lastName1: '',
  lastName2: '',
};

/** "samedi 14 février 2027" — the action day labeled in the modal context. */
function formatDateFrench(calendarDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: EDITION_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(`${calendarDate}T00:00:00Z`));
}

/** French long-form date of the Édition action day (module-scope constant). */
const ACTION_DATE_LABEL = formatDateFrench(CURRENT_EDITION.actionDate);

/** Whether the form holds everything the engagement contract requires. */
function isFormComplete(values: BinomeFormValues, engaged: boolean): boolean {
  const filled = (value: string): boolean => value.trim() !== '';
  return (
    filled(values.firstName1) &&
    filled(values.lastName1) &&
    filled(values.firstName2) &&
    filled(values.lastName2) &&
    engaged
  );
}

interface RegisterBinomeModalProps {
  /** Called when the dialog closes, whatever the way (button, Escape, backdrop). */
  readonly onClose: () => void;
  readonly tour: TourRef;
  /** When true, the dialog is displayed (native `showModal`). */
  readonly visible: boolean;
}

export function RegisterBinomeModal({ onClose, tour, visible }: RegisterBinomeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<BinomeFormValues>(EMPTY_BINOME);
  const [engaged, setEngaged] = useState(false);
  const [outcome, setOutcome] = useState<ModalOutcome>('idle');
  const reloadStatuses = useInscriptionsReload();

  useEffect(() => {
    if (visible) dialogRef.current?.showModal();
  }, [visible]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleDialogClose = (): void => onClose();
    dialog.addEventListener('close', handleDialogClose);
    return () => {
      dialog.removeEventListener('close', handleDialogClose);
    };
  }, [onClose]);

  const zone = getZone(tour.zoneId);
  const complete = isFormComplete(values, engaged);
  const identity: BinomeRegistration = {
    firstName1: values.firstName1.trim(),
    firstName2: values.firstName2.trim(),
    lastName1: values.lastName1.trim(),
    lastName2: values.lastName2.trim(),
    tourId: tour.tourId,
    zoneId: tour.zoneId,
  };

  const close = (): void => dialogRef.current?.close();

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!complete || outcome === 'submitting') return;
    setOutcome('submitting');
    const registration = await postRegistration(identity);
    setOutcome(registration.status);
    if (registration.status === 'created' || registration.status === 'taken') {
      // Badge + button disappearance without a page reload; on `taken` this
      // reload is also the 409 race guard: the tour is covered by another
      // Binôme, and the list state now says so.
      reloadStatuses();
    }
  };

  return (
    <dialog className="modal" id={`register_modal_${tour.tourId}`} ref={dialogRef}>
      <div className="modal-box">
        <form method="dialog">
          <button
            aria-label="Fermer"
            className="btn btn-sm btn-ghost btn-circle absolute top-2 right-2"
          >
            <HugeiconsIcon icon={CancelIcon} strokeWidth={1.5} />
          </button>
        </form>

        <h3 className="text-xl font-bold">Inscription du binôme</h3>
        <p className="text-base-content/80 mt-1 text-sm font-light sm:text-base">
          Parcours <span className="text-base-content font-medium">{tour.tourId}</span> — Zone{' '}
          <span className="text-base-content font-medium">{zone.name}</span>
        </p>

        {outcome === 'created' ? (
          <>
            <div className="alert alert-success mt-4 text-sm sm:text-base" role="alert">
              <span>
                <strong>Votre binôme est inscrit</strong> pour ce parcours. Vous serez attendus le{' '}
                {ACTION_DATE_LABEL} au point de rendez-vous ci-dessous.
              </span>
            </div>
            <div className="mt-4 flex items-start gap-2 text-sm sm:text-base">
              <HugeiconsIcon
                icon={Location01Icon}
                strokeWidth={1.5}
                className="text-secondary mt-0.5 size-5 shrink-0"
              />
              <span>
                Point de rendez-vous&nbsp;: <strong>{zone.meetingPoint.name}</strong>
              </span>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={close}>
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 space-y-1.5 text-sm sm:text-base">
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={CalendarDaysIcon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>Jour de l&apos;action&nbsp;: {ACTION_DATE_LABEL}</span>
              </div>
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={Location01Icon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>
                  Point de rendez-vous&nbsp;: {zone.meetingPoint.name} ({zone.name})
                </span>
              </div>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: 'register-first-name-1', key: 'firstName1', label: 'Prénom du membre 1' },
                    { id: 'register-last-name-1', key: 'lastName1', label: 'Nom du membre 1' },
                    { id: 'register-first-name-2', key: 'firstName2', label: 'Prénom du membre 2' },
                    { id: 'register-last-name-2', key: 'lastName2', label: 'Nom du membre 2' },
                  ] as const
                ).map((field) => (
                  <label className="grid gap-1" htmlFor={field.id} key={field.id}>
                    <span className="text-sm">{field.label}</span>
                    <input
                      className="input w-full"
                      id={field.id}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      required
                      type="text"
                      value={values[field.key]}
                    />
                  </label>
                ))}
              </div>

              <label className="label mt-4 items-start gap-2">
                <input
                  checked={engaged}
                  className="checkbox mt-0.5"
                  id="register-engaged"
                  onChange={(event) => setEngaged(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span className="text-sm">
                  Nous nous engageons à participer ensemble au nettoyage de ce parcours.
                </span>
              </label>

              {outcome === 'taken' ? (
                <div className="alert alert-warning mt-4 text-sm" role="alert">
                  Ce parcours vient d&apos;être couvert par un autre binôme : vous pouvez choisir un
                  autre parcours libre.
                </div>
              ) : null}
              {outcome === 'invalid' ? (
                <div className="alert alert-error mt-4 text-sm" role="alert">
                  Formulaire invalide : vérifiez chaque champ et la case d&apos;engagement.
                </div>
              ) : null}
              {outcome === 'error' ? (
                <div className="alert alert-error mt-4 text-sm" role="alert">
                  Une erreur est survenue : réessayez dans quelques instants.
                </div>
              ) : null}

              <div className="modal-action">
                <button
                  className="btn btn-primary max-sm:btn-sm sm:btn-md"
                  disabled={!complete || outcome === 'submitting'}
                  type="submit"
                >
                  {outcome === 'submitting' ? 'Inscription en cours…' : 'Inscrire mon binôme'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
}
