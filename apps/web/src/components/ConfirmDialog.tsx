import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  errorMessage?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm, styled like the rest of the app and used for destructive actions.
 * Cancel gets the initial focus so pressing Enter by reflex never destroys anything.
 */
export function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel,
  pendingLabel = confirmLabel,
  isPending = false,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="text-sm text-ink-muted">{children}</div>
      {errorMessage && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isPending} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
