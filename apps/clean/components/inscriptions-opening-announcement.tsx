'use client';

import { CURRENT_EDITION, formatActionDateLabel } from '../src/app/inscriptions/edition';
import { registrationWindowPhaseOf, useInscriptionsStatus } from './inscriptions-status-provider';

/**
 * The home announcement of the inscriptions opening date (ticket #34) — one
 * single mention at the top of the tours list, inside the inscriptions status
 * provider like the coverage badges and the register buttons (ticket #16).
 * While the registration window has not opened yet, it announces « Les
 * inscriptions ouvrent le <date in letters> » in French, the date built by
 * `formatActionDateLabel` from the Édition the public state answered (the
 * bundled `CURRENT_EDITION` only as the fallback of an unknown state, the
 * same pattern as the modal's messages). Once the window is open the mention
 * disappears (it would state the opposite of what the site offers) and it
 * never comes back after the closing bound.
 *
 * The mention requires the public state to be LOADED (screen-shot contract
 * of the degraded home, tickets #16–#18): while the statuses are loading and
 * on a fetch error, nothing renders — so the statically prerendered home
 * page carries no announcement either; the mention resolves purely
 * client-side, after the provider's fetch effect (no `Date` read at module
 * scope, nothing rendered on the server pass). It re-renders from the state
 * alone, so a window that opens after the first load (statuses reload)
 * removes it without any page reload.
 *
 * Styled like the modal's warning alerts (DaisyUI `alert alert-warning`),
 * with the home spacing rhythm (`mb-4 sm:mb-8`) of the sibling cards.
 */
interface InscriptionsOpeningAnnouncementProps {
  /**
   * The instant the local clock reads. Injectable so the window phase of a
   * given Édition is testable without depending on the wall clock of the
   * runner (modal precedent).
   */
  readonly now?: Date;
}

export function InscriptionsOpeningAnnouncement({
  now = new Date(),
}: InscriptionsOpeningAnnouncementProps) {
  const status = useInscriptionsStatus();
  /**
   * The Édition whose opening date is announced: the one the server answered
   * when the public state loaded, the bundled one otherwise (fallback kept
   * for the unknown states — which render nothing, see below).
   */
  const edition = status.status === 'success' ? status.state.edition : CURRENT_EDITION;
  /**
   * The loaded state is required: while loading and on error the window is
   * unknown (the site shows neither badge nor button), and the mention never
   * shows either. When loaded, the ONE rule of the provider tells the two
   * closed bounds apart: before the opening bound the opening date is
   * announced, after the closing bound the mention stays away.
   */
  if (status.status !== 'success' || registrationWindowPhaseOf(status, now) !== 'not-open-yet') {
    return null;
  }
  return (
    <div className="alert alert-warning mb-4 sm:mb-8 text-sm sm:text-base" role="alert">
      {`Les inscriptions ouvrent le ${formatActionDateLabel(edition.inscriptionsOpenDate)}.`}
    </div>
  );
}
