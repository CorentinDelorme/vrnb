/**
 * Annual action edition.
 *
 * One edition per year: update `year` and `actionDate` in a single commit when
 * the association announces the next edition. The registration window, the KV
 * key namespace (`inscriptions:<year>:...`) and the tracking sheets all derive
 * from these values, so the annual reset needs no other change.
 */
export interface ActionEdition {
  /** Edition year, also the KV key namespace and the annual reset boundary. */
  readonly year: number;
  /** Action date (`YYYY-MM-DD`, Europe/Paris time); registration stays open through this day. */
  readonly actionDate: string;
}

export const ACTION_EDITION: ActionEdition = {
  year: 2027,
  actionDate: '2027-02-14',
};

const parisDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Current calendar date in Europe/Paris as `YYYY-MM-DD` (comparable to `actionDate`). */
export function parisIsoDate(now: Date): string {
  const parts = parisDateFormatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Registration is open until the end of the action day (inclusive). */
export function isRegistrationOpen(edition: ActionEdition, now: Date): boolean {
  return parisIsoDate(now) <= edition.actionDate;
}

/** Human label of the action date, e.g. "dimanche 14 février 2027". */
export function formatActionDate(edition: ActionEdition): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${edition.actionDate}T12:00:00Z`));
}
