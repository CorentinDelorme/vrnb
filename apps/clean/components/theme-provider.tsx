'use client';

import { useEffect } from 'react';

/**
 * Applies the theme (light/dark) on the `<html>` element via the `dark`
 * class (shadcn). Reads the preference stored in `localStorage`, then falls
 * back on the system preference (`prefers-color-scheme: dark`).
 * Manual switching (button/theme-switcher) can be added later by writing
 * `localStorage.setItem('theme', 'dark' | 'light')` and calling `applyTheme()`
 * again.
 */
export function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = (): void => {
      const stored = localStorage.getItem('theme');
      const isDark =
        stored === 'dark' ||
        (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (): void => {
      if (localStorage.getItem('theme') === null) {
        applyTheme();
      }
    };
    media.addEventListener('change', handler);
    return (): void => {
      media.removeEventListener('change', handler);
    };
  }, []);

  return null;
}
