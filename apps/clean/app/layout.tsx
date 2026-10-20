import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AppHeader } from '../components/app-header';
import { HOME_TITLE } from '../lib/route-meta';
import './globals.css';

/**
 * Root layout — port of the legacy `src/index.html` + `app.html` shell (spec #3):
 * `<html lang="fr">`, the restrictive viewport (kept for map pinch-zoom and axe
 * parity), the favicon, the header, and the Vercel analytics/insights hooks.
 * The DaisyUI `vrnb`/`vrnb-dark` themes and Leaflet CSS load from `globals.css`.
 *
 * Scroll restoration: the App Router scrolls back to the top on every
 * navigation (the spec #3 parity intent: scroll restored to the top when
 * navigating), asserted by `e2e/navigation.spec.ts`. No custom scroll
 * handling lives here, so browser-back keeps the browser's own restoration.
 */
export const metadata: Metadata = {
  title: HOME_TITLE,
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" className="h-screen w-screen">
      <body className="h-screen w-screen">
        <main className="p-4 sm:p-8">
          <AppHeader />
          {children}
        </main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
