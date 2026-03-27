import Image from 'next/image'
import Link from 'next/link'

import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Media, Partenaire } from '@/payload-types'

/** Fetch partners sorted by ordre */
async function getPartenaires(): Promise<Partenaire[]> {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    const result = await payload.find({
      collection: 'partenaires',
      depth: 1,
      sort: 'ordre',
      limit: 100,
    })
    return result.docs
  } catch {
    return []
  }
}

/** Get logo URL from a Partenaire's logo field */
function getLogoUrl(logo: Partenaire['logo']): { url: string; alt: string } | null {
  if (!logo || typeof logo === 'string') return null
  const media = logo as Media
  return media.url ? { url: media.url, alt: media.alt || 'Logo partenaire' } : null
}

export async function SiteFooter() {
  const partenaires = await getPartenaires()

  return (
    <footer className="bg-base-200 text-base-content mt-auto">
      {/* Partners carousel */}
      {partenaires.length > 0 && (
        <div className="py-8 overflow-hidden">
          <div className="flex animate-scroll gap-8 px-4">
            {/* Duplicate items for infinite scroll effect */}
            {[...partenaires, ...partenaires].map((partenaire, index) => {
              const logo = getLogoUrl(partenaire.logo)
              return (
                <a
                  key={`${partenaire.id}-${index}`}
                  href={partenaire.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 min-w-25 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                  title={partenaire.nom}
                >
                  {logo ? (
                    <Image
                      src={logo.url}
                      alt={logo.alt}
                      width={80}
                      height={80}
                      className="rounded object-contain"
                    />
                  ) : (
                    <span className="text-sm">{partenaire.nom}</span>
                  )}
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer links and copyright */}
      <div className="footer footer-center py-6 gap-4 border-t border-base-300">
        <nav
          className="flex flex-wrap justify-center gap-4"
          aria-label="Footer navigation"
        >
          <Link href="/presentation" className="link link-hover">
            Qui sommes-nous ?
          </Link>
          <Link href="/mentionslegales" className="link link-hover">
            Mentions légales
          </Link>
          <Link href="/contact" className="link link-hover">
            Contact
          </Link>
        </nav>
        <p className="text-sm opacity-70">&copy;2026 VRNB</p>
      </div>
    </footer>
  )
}
