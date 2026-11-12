import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'default' | 'wide';
  children: ReactNode;
}

/**
 * Native <dialog> as a modal: focus trapping, Esc to close and the backdrop come from the browser.
 * Rendered in a portal on <body> so dialogs opened from inside the editor (e.g. a diagram node)
 * are outside ProseMirror's DOM and their inputs don't get captured by the editor.
 */
export function Dialog({ isOpen, onClose, title, description, size = 'default', children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="dialog-title"
      // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(event) => event.target === dialogRef.current && onClose()}
      className={
        'm-auto w-[calc(100%-2rem)] rounded-lg border border-line bg-sheet p-0 text-ink shadow-xl backdrop:bg-ink/30 ' +
        (size === 'wide' ? 'max-w-5xl' : 'max-w-lg')
      }
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
