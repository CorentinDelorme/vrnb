'use client';

import {
  CalendarAdd01Icon,
  CalendarDaysIcon,
  Location01Icon,
  StickyNote01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { actionHoursLabel, tourGoogleCalendarUrl } from '../lib/tour-calendar';
import type { Edition, RegistrationWindowPhase } from '../src/app/inscriptions/edition';
import {
  CURRENT_EDITION,
  INSCRIPTIONS_RETENTION_DAYS,
  REGISTRATION_CLOSURE_DAYS,
  formatActionDateLabel,
} from '../src/app/inscriptions/edition';
import { postRegistration } from '../src/app/inscriptions/inscriptions-client';
import type {
  BinomeRegistration,
  IdentityField,
  IdentityFieldError,
} from '../src/app/inscriptions/validation';
import {
  IDENTITY_FIELD_MAX_LENGTH,
  IDENTITY_FIELD_MIN_LENGTH,
  checkIdentityFields,
} from '../src/app/inscriptions/validation';
import type { TourRef } from '../src/app/tours-queries';
import { getZone } from '../src/app/zones';
import {
  registrationWindowPhaseOf,
  useInscriptionsReload,
  useInscriptionsStatus,
} from './inscriptions-status-provider';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from './ui/field';
import { Input } from './ui/input';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from './ui/item';

/** A FieldSet for one member of the Binôme (Prénom + Nom). */
function MemberFieldSet({
  keyPrefix,
  errors,
  touched,
  onBlur,
  onChange,
  values,
  windowNotOpen,
}: {
  readonly keyPrefix: '1' | '2';
  readonly errors: Readonly<Partial<Record<IdentityField, IdentityFieldError>>>;
  readonly touched: Readonly<Partial<Record<IdentityField, boolean>>>;
  readonly onBlur: (key: IdentityField) => void;
  readonly onChange: (key: IdentityField, value: string) => void;
  readonly values: Readonly<Record<IdentityField, string>>;
  readonly windowNotOpen: boolean;
}) {
  const firstNameKey = `firstName${keyPrefix}` as IdentityField;
  const lastNameKey = `lastName${keyPrefix}` as IdentityField;

  return (
    <FieldSet className="gap-2">
      <FieldLegend>Membre {keyPrefix}</FieldLegend>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { key: firstNameKey, label: 'Prénom', id: `register-first-name-${keyPrefix}` },
          { key: lastNameKey, label: 'Nom', id: `register-last-name-${keyPrefix}` },
        ].map((field) => {
          const error = errors[field.key];
          const showError =
            error !== undefined && (error !== 'required' || touched[field.key] === true);
          return (
            <Field key={field.id} data-invalid={showError || undefined}>
              <FieldLabel htmlFor={field.id} className="text-sm">
                {field.label}
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-describedby={showError ? `${field.id}-error` : undefined}
                  aria-invalid={showError ? true : undefined}
                  className="w-full min-w-0"
                  data-testid={field.id}
                  disabled={windowNotOpen}
                  id={field.id}
                  onBlur={() => onBlur(field.key)}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  required
                  type="text"
                  value={values[field.key]}
                />
                <FieldError className="text-xs" id={`${field.id}-error`}>
                  {showError ? FIELD_ERROR_MESSAGES[error] : undefined}
                </FieldError>
              </FieldContent>
            </Field>
          );
        })}
      </div>
    </FieldSet>
  );
}

/**
 * Registration modal of one Parcours (tickets #17 + #18): it shows the
 * selected tour context — Zone name, Parcours name, action date and the Zone
 * meeting point — and collects the two Binôme identities plus the required
 * engagement statement. Rendered as a shadcn `Dialog` controlled through the
 * `open`/`onOpenChange` props; the legacy `register_modal_<tourId>` id is kept
 * on `DialogContent` for the E2E suite.
 *
 * Submitting posts the registration and degrades on every outcome: created →
 * confirmation + statuses reload, taken (covered meanwhile) → last-resort
 * guard + statuses reload, and each refusal gets its own explicit French
 * message (400 saisie invalide / fenêtre fermée, 409 parcours déjà couvert,
 * 500 et erreur réseau). The identity inputs keep their values over
 * close/reopen — the host keeps this component mounted and only toggles
 * `visible` — while nothing resets except a fresh mount.
 *
 * Ticket #18 adds the three guards of the registration window:
 *
 * - the hidden anti-bot honeypot (present in the DOM, invisible to humans):
 *   a filled one is refused by the server with 400 and nothing is stored —
 *   silently, like any other invalid input, so the modal never reveals the
 *   trap;
 * - the registration window bounds: before the opening day of the Édition,
 *   the modal announces the opening date in letters (« Les inscriptions
 *   ouvriront le lundi 4 janvier 2027 ») and disables its whole form; after
 *   the closing bound — 3 days before the action date — it keeps saying «
 *   Les inscriptions sont closes » and disables it (the server refuses the
 *   same requests with 400, each bound with its own code);
 * - the shared identity bounds (2 to 60 characters per name, see
 *   `validation.ts`): the submit is enabled as soon as the form is complete
 *   and valid, and each field shows its own error message.
 *
 * Ticket #36 turns the created outcome into a meeting point: the confirmation
 * explicitly asks to note the zone and the Parcours name, recalls the action
 * hours of the Édition config around the action date, keeps naming the Point
 * de rendez-vous and offers the two agenda links — the Google Calendar link
 * built by the pure `tour-calendar` module (opened in a new tab) and the
 * calendar file link towards `/api/calendrier/<zone>/<parcours>`. Both links
 * exist ONLY on this state, never on the form, never anywhere else on the
 * site (not in the Menu, not on the home page, not in the mode d'emploi).
 */

/** The four identity fields of the Binôme form, as controlled inputs. */
interface BinomeFormValues {
  readonly firstName1: string;
  readonly firstName2: string;
  readonly lastName1: string;
  readonly lastName2: string;
}

/** Lifecycle of a registration inside the modal (idle → submitting → outcome). */
type ModalOutcome =
  'idle' | 'submitting' | 'created' | 'taken' | 'invalid' | 'not-open' | 'closed' | 'error';

const EMPTY_BINOME: BinomeFormValues = {
  firstName1: '',
  firstName2: '',
  lastName1: '',
  lastName2: '',
};

/**
 * The message of the not-open-yet registration window (also the `not-open`
 * 400 answer of the API): the opening date of the ÉDITION IN PLAY announced
 * in letters — a function of the edition because that date is quoted from
 * the loaded public state's Édition when it loaded (the same source rule as
 * the home announcement) and from the bundled `CURRENT_EDITION` otherwise.
 * The verb tense is intentional: the modal promises (« ouvriront ») where
 * the home states (« ouvrent », spec-fixed); both dates are derived by the
 * ONE `formatActionDateLabel`.
 */
function notOpenYetMessage(edition: Edition): string {
  return `Les inscriptions ouvriront le ${formatActionDateLabel(edition.inscriptionsOpenDate)}.`;
}

/** The message of the closed registration window (also the 400 answer). */
const CLOSED_WINDOW_MESSAGE = `Les inscriptions sont closes : la fenêtre se ferme ${REGISTRATION_CLOSURE_DAYS} jours avant la date de l'action.`;

const GDPR_NOTICE = `Vos informations servent à établir les fiches de suivi de l'action. Les données sont effacées ${INSCRIPTIONS_RETENTION_DAYS} jours après l'action.`;

/** The inline French feedback of each identity field error. */
const FIELD_ERROR_MESSAGES: Readonly<Record<IdentityFieldError, string>> = {
  required: 'Champ obligatoire.',
  'too-short': `${IDENTITY_FIELD_MIN_LENGTH} caractères minimum.`,
  'too-long': `${IDENTITY_FIELD_MAX_LENGTH} caractères maximum.`,
};

/**
 * The explicit French feedback of each refusal of the server (ticket #18),
 * mapped by outcome — the two window bounds refused apart since the window
 * gained its opening bound. Built per render from the Édition in play: the
 * `not-open` bound announces the opening date of THAT Édition (the loaded
 * public state's answer, the bundled `CURRENT_EDITION` otherwise — see
 * `notOpenYetMessage`), the other sentences never change. The created,
 * submitting and idle outcomes have no refusal alert of their own.
 */
function outcomeAlerts(edition: Edition): Readonly<Partial<Record<ModalOutcome, string>>> {
  return {
    taken:
      "Ce parcours vient d'être couvert par un autre binôme : vous pouvez choisir un autre parcours libre.",
    invalid: "Saisie invalide : vérifiez les noms saisis et la case d'engagement, puis réessayez.",
    'not-open': notOpenYetMessage(edition),
    closed: CLOSED_WINDOW_MESSAGE,
    error: 'Une erreur est survenue : réessayez dans quelques instants.',
  };
}

/**
 * The typography of the window-bound / outcome alerts, kept in sync with the
 * surrounding copy (`text-sm` on mobile, `text-base` from `sm:` on).
 */
const ALERT_LEVEL_CLASS = 'text-sm sm:text-base';

/**
 * The window-bound warning shown above the form while the window forbids
 * registering — ONE block for the two bounds (they used to be two
 * near-duplicated JSX blocks): the not-open-yet bound announces the opening
 * date in letters, the closed bound notes it is closed. It stands down when
 * the outcome of the SAME bound (a 400 `not-open`/`closed` answer) already
 * quotes that sentence inside the form, and never renders on the open
 * phase.
 */
function windowBoundAlert(
  edition: Edition,
  outcome: ModalOutcome,
  windowPhase: RegistrationWindowPhase,
): string | null {
  switch (windowPhase) {
    case 'not-open-yet':
      return outcome === 'not-open' ? null : notOpenYetMessage(edition);
    case 'open':
      return null;
    case 'closed':
      return outcome === 'closed' ? null : CLOSED_WINDOW_MESSAGE;
  }
}

interface RegisterBinomeModalProps {
  /** Called when the dialog closes, whatever the way (button, Escape, backdrop). */
  readonly onClose: () => void;
  /**
   * The instant the local clock reads, when the public state could not be
   * loaded and the modal falls back on its own clock. Injectable so the
   * fallback is testable without depending on the wall clock of the runner.
   */
  readonly now?: Date;
  readonly tour: TourRef;
  /** When true, the dialog is displayed. */
  readonly visible: boolean;
}

export function RegisterBinomeModal({
  now = new Date(),
  onClose,
  tour,
  visible,
}: RegisterBinomeModalProps) {
  const [values, setValues] = useState<BinomeFormValues>(EMPTY_BINOME);
  const [touched, setTouched] = useState<Readonly<Partial<Record<IdentityField, boolean>>>>({});
  const [engaged, setEngaged] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [outcome, setOutcome] = useState<ModalOutcome>('idle');
  const reloadStatuses = useInscriptionsReload();
  const status = useInscriptionsStatus();

  const zone = getZone(tour.zoneId);
  /**
   * The Édition IN PLAY — the one every date quoted here comes from: the
   * loaded public state's Édition when the server answered (the same source
   * rule as the home announcement), the bundled `CURRENT_EDITION` otherwise
   * (loading and fetch-error fallbacks). Derived once, so the opening
   * announcement, the action-day context, the confirmation and the Google
   * Calendar link always quote the same Édition.
   */
  const edition = status.status === 'success' ? status.state.edition : CURRENT_EDITION;
  /** The context of the action day, built from that Édition alone. */
  const actionDateLabel = formatActionDateLabel(edition.actionDate);
  /** The hours of the action, through the calendar module's own helper. */
  const actionHours = actionHoursLabel(edition);
  /**
   * The note-to-take sentence of the confirmation (ticket #36), built as one
   * string: the zone and the Parcours come from the selected tour (never a
   * literal), and the JSX compiler would glue text following an HTML entity
   * (spacing pitfall, see `GDPR_NOTICE`).
   */
  const noteSentence = `Notez la zone et le nom du parcours pour le jour de l'action\u00a0: ${zone.name} - ${tour.tourId}.`;
  /**
   * The registration window of the Édition, from the ONE rule of the provider
   * (the server's answer when the public state loaded, the local clock
   * otherwise): the client and the server always agree. Both window bounds
   * disable the form and warn through the ONE `windowBoundAlert` block —
   * before the opening bound the opening date is announced in letters, after
   * the closing bound the closing message unchanged.
   */
  const windowPhase = registrationWindowPhaseOf(status, now);
  const windowNotOpen = windowPhase !== 'open';
  const { errors, values: trimmed } = checkIdentityFields(values);
  /** The submit is enabled as soon as the form is complete and valid. */
  const complete = Object.keys(errors).length === 0 && engaged;
  const identity: BinomeRegistration = {
    firstName1: trimmed.firstName1,
    firstName2: trimmed.firstName2,
    honeypot,
    lastName1: trimmed.lastName1,
    lastName2: trimmed.lastName2,
    tourId: tour.tourId,
    zoneId: tour.zoneId,
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!complete || outcome === 'submitting' || windowNotOpen) return;
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

  /**
   * The alert of the last submit outcome (inside the form), from the SAME
   * edition-derived registry the pre-form bound warning uses (`null` before
   * any submission).
   */
  const outcomeAlert = outcomeAlerts(edition)[outcome];
  /** The window-bound warning above the form (`null` on the open phase). */
  const boundAlert = windowBoundAlert(edition, outcome, windowPhase);

  return (
    <Dialog
      open={visible}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        id={`register_modal_${tour.tourId}`}
        className="max-h-[90dvh] w-11/12 max-w-md overflow-y-auto sm:max-w-xl"
      >
        {/* Accessible name of the dialog: Base UI wires the popup's
            aria-labelledby to this DialogTitle automatically. The header is
            shared by the form and the created confirmation, so the ONE title
            covers both states. */}
        <DialogTitle className="text-xl font-bold">Inscription du binôme</DialogTitle>
        <p className="text-foreground/80 text-sm font-light sm:text-base">
          Zone <span className="text-foreground font-medium">{zone.name}</span> - Parcours{' '}
          <span className="text-foreground font-medium">{tour.tourId}</span>
        </p>

        {outcome === 'created' ? (
          <>
            <Item variant="muted">
              <ItemMedia variant="icon" className="text-secondary">
                <HugeiconsIcon
                  icon={StickyNote01Icon}
                  strokeWidth={1.5}
                  className="size-5 shrink-0"
                />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Votre binôme est inscrit pour ce parcours.</ItemTitle>
                <ItemDescription className="line-clamp-none">
                  Vous serez attendus le {actionDateLabel} {actionHours} au point de rendez-vous
                  ci-dessous.
                </ItemDescription>
              </ItemContent>
            </Item>
            {/* The think-about-it notes of the confirmation day, below the
                Item above — one column gap-2 for the three detail rows, the
                agenda block spacing on the parent Dialog grid gap. */}
            <div className="flex flex-col gap-2 text-sm sm:text-base">
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={StickyNote01Icon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>{noteSentence}</span>
              </div>
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={Location01Icon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>
                  Point de rendez-vous&nbsp;: <strong>{zone.meetingPoint.name}</strong>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <HugeiconsIcon
                    icon={CalendarAdd01Icon}
                    strokeWidth={1.5}
                    className="text-secondary mt-0.5 size-5 shrink-0"
                  />
                  <span>L&apos;ajouter à mon agenda&nbsp;:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    onClick={() =>
                      window.open(
                        tourGoogleCalendarUrl({
                          address: zone.meetingPoint.address,
                          edition,
                          pointDeRendezVous: zone.meetingPoint.name,
                          tourId: tour.tourId,
                          zoneId: tour.zoneId,
                          zoneName: zone.name,
                        }),
                        '_blank',
                      )
                    }
                  >
                    Google Agenda
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/api/calendrier/${tour.zoneId}/${tour.tourId}`)
                    }
                  >
                    Fichier calendrier (.ics)
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="default" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-sm sm:text-base">
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={CalendarDaysIcon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>
                  Jour de l&apos;action&nbsp;: {actionDateLabel} {actionHours}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <HugeiconsIcon
                  icon={Location01Icon}
                  strokeWidth={1.5}
                  className="text-secondary mt-0.5 size-5 shrink-0"
                />
                <span>Point de rendez-vous&nbsp;: {zone.meetingPoint.name}</span>
              </div>
            </div>

            {/* The window-bound warning, resolved through the ONE helper
                for both bounds; it stands down when the outcome of the same
                bound already quotes the sentence inside the form. */}
            {boundAlert ? (
              <Alert className={ALERT_LEVEL_CLASS} variant="default">
                <AlertDescription>{boundAlert}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={(event) => void submit(event)}>
              <FieldGroup>
                <MemberFieldSet
                  keyPrefix="1"
                  errors={errors}
                  touched={touched}
                  onBlur={(key) => setTouched((current) => ({ ...current, [key]: true }))}
                  onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
                  values={values}
                  windowNotOpen={windowNotOpen}
                />

                <MemberFieldSet
                  keyPrefix="2"
                  errors={errors}
                  touched={touched}
                  onBlur={(key) => setTouched((current) => ({ ...current, [key]: true }))}
                  onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
                  values={values}
                  windowNotOpen={windowNotOpen}
                />

                <Field orientation="horizontal">
                  <FieldLabel htmlFor="register-engaged" className="text-sm whitespace-normal">
                    <Checkbox
                      checked={engaged}
                      disabled={windowNotOpen}
                      id="register-engaged"
                      onCheckedChange={(checked) => setEngaged(checked)}
                      required
                    />
                    Nous confirmons notre participation à ce parcours de nettoyage.
                  </FieldLabel>
                </Field>

                {/* Anti-bot honeypot (ticket #18): the field is in the DOM — a bot
                    filling every input of the form fills it — but a human never
                    sees it (hidden) and never reaches it (out of the tab order and
                    of the accessibility tree). A filled honeypot is refused by the
                    server with a 400 and nothing is stored. */}
                <input
                  aria-hidden="true"
                  autoComplete="off"
                  hidden
                  id="register-website"
                  name="website"
                  onChange={(event) => setHoneypot(event.target.value)}
                  tabIndex={-1}
                  type="text"
                  value={honeypot}
                />

                <p className="text-muted-foreground/70 text-xs sm:text-sm">{GDPR_NOTICE}</p>

                {outcomeAlert ? (
                  <Alert className={ALERT_LEVEL_CLASS} variant="destructive">
                    <AlertDescription>{outcomeAlert}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    variant="default"
                    disabled={!complete || outcome === 'submitting' || windowNotOpen}
                    type="submit"
                  >
                    {outcome === 'submitting' ? 'Inscription en cours…' : 'Inscrire mon binôme'}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
