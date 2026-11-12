import { FileCode, FileDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface ExportMenuProps {
  onExportPdf: () => void;
  onExportMarkdown: () => void;
}

const menuItemClasses =
  'flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-canvas focus:bg-canvas';

/** One header button for every export format, so the compact mobile header keeps room for the title. */
export function ExportMenu({ onExportPdf, onExportMarkdown }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setIsOpen(false);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function runAndClose(exportAction: () => void) {
    setIsOpen(false);
    exportAction();
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        aria-label="Export"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Export"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      >
        <FileDown size={16} aria-hidden="true" />
      </Button>
      {isOpen && (
        <div
          role="menu"
          className="print-hidden absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-line bg-sheet p-1 shadow-lg"
        >
          <button type="button" role="menuitem" className={menuItemClasses} onClick={() => runAndClose(onExportPdf)}>
            <FileDown size={15} aria-hidden="true" />
            PDF (print)
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClasses}
            onClick={() => runAndClose(onExportMarkdown)}
          >
            <FileCode size={15} aria-hidden="true" />
            Markdown (.md)
          </button>
        </div>
      )}
    </div>
  );
}
