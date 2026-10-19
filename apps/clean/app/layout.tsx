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

export default function RootLayout({ children }: { readonly children: ReactNode }) {
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
