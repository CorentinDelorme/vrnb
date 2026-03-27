'use client';

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

export interface ModalProps extends HTMLAttributes<HTMLDialogElement> {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Footer actions */
  actions?: ReactNode;
}

/** Modal dialog component */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  className = '',
  ...props
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      onClose={onClose}
      {...props}
    >
      <div className="modal-box">
        {title && <h3 className="font-bold text-lg">{title}</h3>}
        <div className="py-4">{children}</div>
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
