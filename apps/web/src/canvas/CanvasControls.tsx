import { AlertTriangle, Crosshair, FileDown, Lock, LockOpen } from 'lucide-react';
import type { CanvasSaveStatus } from './use-canvas-autosave';

interface CanvasControlsProps {
  isLocked: boolean;
  canEdit: boolean;
  canvasSaveStatus: CanvasSaveStatus;
  onToggleLock: () => void;
  onResetPosition: () => void;
  onPrint: () => void;
}

/** Floating page controls, bottom-right (Excalidraw keeps its zoom/undo controls bottom-left). */
export function CanvasControls(props: CanvasControlsProps) {
  const { isLocked, canEdit, canvasSaveStatus, onToggleLock, onResetPosition, onPrint } = props;
  const buttonClasses =
    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink';

  return (
    <div className="print-hidden absolute bottom-4 right-4 z-5 flex items-center gap-1 rounded-lg border border-line bg-sheet p-1 shadow-sm">
      {canvasSaveStatus === 'error' && (
        <span role="alert" className="flex items-center gap-1 px-2 text-xs text-danger">
          <AlertTriangle size={14} aria-hidden="true" />
          Drawings not saved
        </span>
      )}
      {canEdit && (
        <button type="button" onClick={onToggleLock} aria-pressed={isLocked} className={buttonClasses}>
          {isLocked ? <Lock size={15} aria-hidden="true" /> : <LockOpen size={15} aria-hidden="true" />}
          {isLocked ? 'Unlock page' : 'Lock page'}
        </button>
      )}
      <button type="button" onClick={onResetPosition} className={buttonClasses}>
        <Crosshair size={15} aria-hidden="true" />
        {canEdit ? 'Reset position' : 'Recenter'}
      </button>
      <button type="button" onClick={onPrint} className={buttonClasses} title="Print or save as PDF (page only)">
        <FileDown size={15} aria-hidden="true" />
        Export PDF
      </button>
    </div>
  );
}
