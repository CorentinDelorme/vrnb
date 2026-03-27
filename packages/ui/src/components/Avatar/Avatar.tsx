import type { HTMLAttributes } from 'react';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Image URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Size in pixels (renders as w-X h-X) */
  size?: 'sm' | 'md' | 'lg';
  /** Placeholder text when no image (e.g., initials) */
  placeholder?: string;
}

const sizeClassMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8',
  md: 'w-12',
  lg: 'w-16',
};

/** Avatar component with image or placeholder fallback */
export function Avatar({
  src,
  alt = '',
  size = 'md',
  placeholder,
  className = '',
  ...props
}: AvatarProps) {
  const sizeClass = sizeClassMap[size];

  return (
    <div className={`avatar ${!src ? 'placeholder' : ''} ${className}`} {...props}>
      <div className={`${sizeClass} rounded-full ${!src ? 'bg-neutral text-neutral-content' : ''}`}>
        {src ? (
          <img src={src} alt={alt} />
        ) : (
          <span className="text-xl">{placeholder || alt?.charAt(0)?.toUpperCase() || '?'}</span>
        )}
      </div>
    </div>
  );
}
