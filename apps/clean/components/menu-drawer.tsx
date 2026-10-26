'use client';

import { CancelIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';

import type { MenuVariant } from '../lib/route-meta';

import { cn } from '@/components/lib/utils';
import { Button } from './ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from './ui/drawer';

/** Legacy drawer input ids, kept for DOM parity with the Angular templates. */
const DRAWER_IDS: Record<MenuVariant, string> = {
  tour: 'my-drawer-1',
  tours: 'tours-drawer',
};

const MENU_CLASSES: Record<MenuVariant, string> = {
  tour: 'min-h-full w-60 gap-3 p-4 sm:w-80',
  tours: 'min-h-full w-80 gap-3 p-4',
};

interface MenuDrawerProps {
  readonly variant: MenuVariant;
  readonly title: string;
  readonly className?: string;
  readonly children?: ReactNode;
  /** Whether the drawer is open. */
  readonly open: boolean;
  /** Called when the drawer opens or closes (trigger, overlay, Escape). */
  readonly onOpenChange: (open: boolean) => void;
}

export function MenuDrawer({
  variant,
  title,
  className,
  children,
  open,
  onOpenChange,
}: MenuDrawerProps) {
  const drawerId = DRAWER_IDS[variant];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="left">
      <DrawerTrigger id={drawerId} className={cn(className)} aria-label="Menu">
        <Button variant="default">Menu</Button>
      </DrawerTrigger>
      <DrawerContent className={MENU_CLASSES[variant]}>
        <DrawerClose aria-label="close sidebar" className="absolute top-4 right-4">
          <HugeiconsIcon icon={CancelIcon} strokeWidth={1.5} />
        </DrawerClose>

        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-secondary text-2xl font-bold sm:text-4xl">{title}</h1>
        </div>

        {children}
      </DrawerContent>
    </Drawer>
  );
}
