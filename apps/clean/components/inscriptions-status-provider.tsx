'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { InscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';
import { fetchInscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';

/** Tri-state of the statuses loading: `loading` until the effect resolves. */
export type InscriptionsStatus = InscriptionsOutcome | { readonly status: 'loading' };

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
