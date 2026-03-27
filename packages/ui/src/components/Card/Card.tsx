import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title?: string;
  /** Image URL displayed at the top of the card */
  imageUrl?: string;
  /** Image alt text */
  imageAlt?: string;
  /** Card body content */
  children?: ReactNode;
  /** Footer actions */
  actions?: ReactNode;
  /** Whether the card body should be compact */
  compact?: boolean;
}

/** Versatile card component for displaying content */
export function Card({
  title,
  imageUrl,
  imageAlt = '',
  children,
  actions,
  compact = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div className={`card bg-base-100 shadow-sm ${className}`} {...props}>
      {imageUrl && (
        <figure>
          <img src={imageUrl} alt={imageAlt} />
        </figure>
      )}
      <div className={`card-body ${compact ? 'p-4' : ''}`}>
        {title && <h2 className="card-title">{title}</h2>}
        {children}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  );
}
