'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { InscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';
import { fetchInscriptionsOutcome } from '../src/app/inscriptions/inscriptions-client';

/** Tri-state of the statuses loading: `loading` until the effect resolves. */
export type InscriptionsStatus = InscriptionsOutcome | { readonly status: 'loading' };

const InscriptionsStatusContext = createContext<InscriptionsStatus>({ status: 'loading' });

interface InscriptionsStatusProviderProps {
  readonly children: ReactNode;
}

/**
 * Loads the public inscriptions state once, in an effect — i.e. after
 * hydration — so the statically prerendered home page never fetches at render
 * time (ResumeTourBanner precedent). One fetch serves every tour section
 * through the context, and ticket #17 reuses `useInscriptionsStatus` to render
 * the register button next to the play button.
 */
export function InscriptionsStatusProvider({ children }: InscriptionsStatusProviderProps) {
  const [status, setStatus] = useState<InscriptionsStatus>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void fetchInscriptionsOutcome().then((outcome) => {
      if (active) setStatus(outcome);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <InscriptionsStatusContext.Provider value={status}>
      {children}
    </InscriptionsStatusContext.Provider>
  );
}

/** The public inscriptions status of the Édition (loading/error/success). */
export function useInscriptionsStatus(): InscriptionsStatus {
  return useContext(InscriptionsStatusContext);
}
