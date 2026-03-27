import type { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Color variant */
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Badge content */
  children: ReactNode;
}

const variantClassMap: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: '',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  ghost: 'badge-ghost',
  outline: 'badge-outline',
};

const sizeClassMap: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'badge-sm',
  md: 'badge-md',
  lg: 'badge-lg',
};

/** Badge component for labels and tags */
export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}: BadgeProps) {
  const classes = ['badge', variantClassMap[variant], sizeClassMap[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
