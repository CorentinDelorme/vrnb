'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface HeaderClientProps {
  isAuthenticated: boolean
  userId: string | null
  logoUrl: string | null
}

/** Navigation item definition */
interface NavItem {
  label: string
  href: string
  authOnly?: boolean
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', href: '/home' },
  {
    label: 'Association',
    href: '#',
    children: [
      { label: 'Présentation', href: '/presentation' },
      { label: 'Organisation', href: '/organisation' },
      { label: 'Référents', href: '/referents' },
    ],
  },
  {
    label: 'Activités',
    href: '#',
    children: [
      { label: 'Randonnées à vélo', href: '/randosvelo' },
      { label: 'Formations', href: '/formations' },
      { label: 'Projections de films', href: '/projections' },
      { label: 'Éco citoyenneté', href: '/ecocitoyennete' },
      { label: 'Autres activités de plein air', href: '/pleinair' },
    ],
  },
  { label: 'Programme', href: '/activites' },
  { label: 'Nos Balades', href: '/balades', authOnly: true },
  { label: 'Documentation', href: '/documentation', authOnly: true },
  {
    label: 'Espace Adhérent',
    href: '#',
    authOnly: true,
    children: [{ label: 'Trombinoscope', href: '/espace-adherent/trombinoscope' }],
  },
  { label: 'Adhésion', href: '/adhesion' },
]

/** Check if the item or any of its children match the current path */
function isActive(item: NavItem, pathname: string): boolean {
  if (item.href !== '#' && pathname.startsWith(item.href)) return true
  if (item.children) return item.children.some((child) => pathname.startsWith(child.href))
  return false
}

export function HeaderClient({ isAuthenticated, userId, logoUrl }: HeaderClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = NAV_ITEMS.filter((item) => !item.authOnly || isAuthenticated)

  async function handleLogout() {
    try {
      await fetch('/api/users/logout', { method: 'POST' })
      router.push('/home')
      router.refresh()
    } catch {
      // Redirect anyway
      router.push('/home')
    }
  }

  return (
    <header className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
      {/* Logo */}
      <div className="navbar-start">
        <Link href="/home" className="btn btn-ghost text-xl gap-2">
          {logoUrl ? (
            <Image src={logoUrl} alt="VRNB" width={40} height={40} className="rounded" />
          ) : (
            <span className="font-bold">VRNB</span>
          )}
        </Link>
      </div>

      {/* Desktop navigation */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal gap-1">
          {visibleItems.map((item) => {
            const active = isActive(item, pathname)

            if (item.children) {
              return (
                <li key={item.label}>
                  <details>
                    <summary className={active ? 'active' : ''}>{item.label}</summary>
                    <ul className="bg-base-100 rounded-box z-50 w-56 p-2 shadow-lg">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={pathname.startsWith(child.href) ? 'active' : ''}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link href={item.href} className={active ? 'active' : ''}>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Right side: auth actions + profile */}
      <div className="navbar-end gap-2">
        {isAuthenticated && userId && (
          <Link href={`/user/${userId}`} className="btn btn-ghost btn-sm">
            Profil
          </Link>
        )}
        {isAuthenticated ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
            Déconnexion
          </button>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
            Connexion
          </Link>
        )}
      </div>

      {/* Mobile hamburger menu */}
      <div className="dropdown dropdown-end lg:hidden">
        <button type="button" tabIndex={0} className="btn btn-ghost" aria-label="Open menu">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </button>
        <ul
          tabIndex={0}
          className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-64 p-2 shadow-lg"
        >
          {visibleItems.map((item) => {
            if (item.children) {
              return (
                <li key={item.label}>
                  <span className="menu-title">{item.label}</span>
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link href={child.href}>{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            }
            return (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            )
          })}
          <li className="mt-2 border-t border-base-300 pt-2">
            {isAuthenticated && userId && (
              <Link href={`/user/${userId}`}>Profil</Link>
            )}
            {isAuthenticated ? (
              <button type="button" onClick={handleLogout}>
                Déconnexion
              </button>
            ) : (
              <Link href="/login">Connexion</Link>
            )}
          </li>
        </ul>
      </div>
    </header>
  )
}
