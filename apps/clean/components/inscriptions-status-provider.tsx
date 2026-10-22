'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { RegistrationWindowPhase } from '../src/app/inscriptions/edition';
import { CURRENT_EDITION, registrationWindowPhase } from '../src/app/inscriptions/edition';
import type { InscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';
import { fetchInscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';
import type { InscriptionsPublicState } from '../src/app/inscriptions/public-state';

/** Tri-state of the statuses loading: `loading` until the effect resolves. */
export type InscriptionsStatus = InscriptionsOutcome | { readonly status: 'loading' };

/**
 * The phase of the registration window at `now`, from ONE rule spread over
 * the same sources as `isRegistrationWindowOpen`: the server's answer when
 * the public state loaded (the client and the server always agree), the
 * bundled Édition and the local clock otherwise (the safety net of a page
 * whose public state could not be loaded). The `not-open-yet` phase tells
 * the two window bounds apart on the client side, so the refusal messages
 * stay distinct. Pure: the clock is injected, never read.
 */
export function registrationWindowPhaseOf(
  status: InscriptionsStatus,
  now: Date,
): RegistrationWindowPhase {
  return status.status === 'success'
    ? phaseOfLoadedState(status.state, now)
    : registrationWindowPhase(CURRENT_EDITION, now);
}

/**
 * The window phase of a loaded public state: the server's answer is
 * authoritative, so an open window is taken as is; a closed one is told
 * apart between the two bounds from the Édition the answer itself carries
 * and the local clock — a clock that would still read the window open never
 * reopens what the server answered closed.
 */
function phaseOfLoadedState(state: InscriptionsPublicState, now: Date): RegistrationWindowPhase {
  if (state.registrationOpen) return 'open';
  const localPhase = registrationWindowPhase(state.edition, now);
  return localPhase === 'open' ? 'closed' : localPhase;
}

/**
 * Whether the registration window is open, from ONE rule: the server's answer
 * when the public state loaded (the client and the server always agree), the
 * local clock otherwise (the safety net of a page whose public state could
 * not be loaded). Pure: the clock is injected, never read.
 */
export function isRegistrationWindowOpen(status: InscriptionsStatus, now: Date): boolean {
  return registrationWindowPhaseOf(status, now) === 'open';
}

const InscriptionsStatusContext = createContext<InscriptionsStatus>({ status: 'loading' });

/** Reload callback of the provider; a no-op until the provider is mounted. */
const InscriptionsReloadContext = createContext<() => void>(() => {});

interface InscriptionsStatusProviderProps {
  readonly children: ReactNode;
}

/**
 * Loads the public inscriptions state once, in an effect — i.e. after
 * hydration — so the statically prerendered home page never fetches at render
 * time (ResumeTourBanner precedent). One fetch serves every tour section
 * through the context, and ticket #17 reuses `useInscriptionsStatus` to render
 * the register button next to the play button, plus `useInscriptionsReload` to
 * refresh the statuses after a registration (badge + hidden button without a
 * page reload).
 */
export function InscriptionsStatusProvider({ children }: InscriptionsStatusProviderProps) {
  const [status, setStatus] = useState<InscriptionsStatus>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchInscriptionsOutcome().then((outcome) => {
      if (active) setStatus(outcome);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return (
    <InscriptionsReloadContext.Provider value={reload}>
      <InscriptionsStatusContext.Provider value={status}>
        {children}
      </InscriptionsStatusContext.Provider>
    </InscriptionsReloadContext.Provider>
  );
}

/** The public inscriptions status of the Édition (loading/error/success). */
export function useInscriptionsStatus(): InscriptionsStatus {
  return useContext(InscriptionsStatusContext);
}

/**
 * Refetch the public inscriptions state (the last fetch wins). The home
 * register modal calls it after a successful or conflicting registration so
 * the covered tour immediately shows its badge and loses its register button.
 */
export function useInscriptionsReload(): () => void {
  return useContext(InscriptionsReloadContext);
}
