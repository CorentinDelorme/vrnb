import type { HTMLAttributes, ReactNode } from 'react';

export interface FooterProps extends HTMLAttributes<HTMLElement> {
  /** Carousel or featured content at the top of the footer */
  carousel?: ReactNode;
  /** Navigation links rendered in the center */
  links?: ReactNode;
  /** Copyright text */
  copyright?: string;
}

/** Site footer with optional carousel, links and copyright */
export function Footer({
  carousel,
  links,
  copyright,
  className = '',
  ...props
}: FooterProps) {
  return (
    <footer className={`bg-base-200 text-base-content ${className}`} {...props}>
      {carousel && <div className="py-6">{carousel}</div>}
      <div className="footer footer-center py-6 gap-4">
        {links && <nav className="flex flex-wrap justify-center gap-4" aria-label="Footer navigation">{links}</nav>}
        {copyright && <p className="text-sm opacity-70">{copyright}</p>}
      </div>
    </footer>
  );
}
