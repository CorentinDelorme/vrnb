import * as React from 'react';

import { cn } from '@/components/lib/utils';
import { Button } from './button';

const ButtonGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-input bg-background p-1 text-sm shadow-sm',
        className,
      )}
      {...props}
    />
  ),
);
ButtonGroup.displayName = 'ButtonGroup';

const ButtonGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    variant?: 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  }
>(({ className, variant, ...props }, ref) => (
  <Button
    ref={ref}
    variant={variant ?? 'outline'}
    className={cn(
      'border-b border-t rounded-none hover:bg-accent hover:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      variant === 'outline' && 'border-y',
      variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
      className,
    )}
    {...props}
  />
));
ButtonGroupItem.displayName = 'ButtonGroupItem';

export { ButtonGroup, ButtonGroupItem };
