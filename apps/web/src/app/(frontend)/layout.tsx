import React from 'react'
import 'ui/globals.css'

import { Header } from '@/components/Header'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  description: 'Vélo Rando Nature Bruz — Association de cyclotourisme et activités de plein air.',
  title: 'VRNB — Vélo Rando Nature Bruz',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="fr" data-theme="vrnb">
      <body className="min-h-screen flex flex-col bg-base-100 text-base-content">
        <Header />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
