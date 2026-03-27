import type { HTMLAttributes } from 'react';

export interface HeroImageProps extends HTMLAttributes<HTMLDivElement> {
  /** Image URL */
  imageUrl: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** Title text overlay centered on the image */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
}

/** Full-width hero image with centered text overlay */
export function HeroImage({
  imageUrl,
  imageAlt = '',
  title,
  subtitle,
  className = '',
  ...props
}: HeroImageProps) {
  return (
    <div
      className={`hero min-h-64 ${className}`}
      style={{ backgroundImage: `url(${imageUrl})` }}
      role="img"
      aria-label={imageAlt || title || ''}
      {...props}
    >
      <div className="hero-overlay bg-opacity-40" />
      <div className="hero-content text-center text-neutral-content">
        <div className="max-w-md">
          {title && <h1 className="text-3xl font-bold lg:text-5xl">{title}</h1>}
          {subtitle && <p className="mt-2 text-lg">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
