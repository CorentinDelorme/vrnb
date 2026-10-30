'use client';

import { useEffect, useState } from 'react';

/**
 * Footer with current year — client-only to avoid hydration mismatch.
 * The year is computed on the client after hydration so SSR and client
 * always match (both show the calendar year at render time).
 */
export function Footer() {
  const [year, setYear] = useState(0);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="text-center text-sm opacity-70">
      ©{year} Vélo Rando Nature Bruz (VRNB)
    </footer>
  );
}
