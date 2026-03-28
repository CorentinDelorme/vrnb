import type { HTMLAttributes, ReactNode } from 'react';

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  /** Logo element displayed on the left */
  logo?: ReactNode;
  /** Center menu items */
  menuItems?: ReactNode;
  /** Right-side actions (e.g., login/logout buttons) */
  actions?: ReactNode;
}

/** Responsive navigation bar */
export function Navbar({
  logo,
  menuItems,
  actions,
  className = '',
  ...props
}: NavbarProps) {
  return (
    <nav
      className={`navbar bg-base-100 shadow-sm ${className}`}
      aria-label="Main navigation"
      {...props}
    >
      <div className="navbar-start">
        {logo && <div className="shrink-0">{logo}</div>}
      </div>
      <div className="navbar-center hidden lg:flex">
        {menuItems && (
          <ul className="menu menu-horizontal gap-1">{menuItems}</ul>
        )}
      </div>
      <div className="navbar-end gap-2">{actions}</div>
      {/* Mobile menu toggle */}
      <div className="dropdown lg:hidden">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost"
          aria-label="Open menu"
        >
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
          className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
        >
          {menuItems}
        </ul>
      </div>
    </nav>
  );
}
