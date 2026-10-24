'use client';

import { useEffect } from 'react';

/**
 * Applique le thème (clair/sombre) sur l'élément `<html>` via la classe
 * `dark` (shadcn). Lecture de la préférence stockée dans `localStorage`,
 * puis fallback sur la préférence système (`prefers-color-scheme: dark`).
 * Le basculement manuel (bouton/theme-switcher) peut être ajouté plus tard
 * en écrivant `localStorage.setItem('theme', 'dark' | 'light')` et en
 * appelant à nouveau `applyTheme()`.
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
