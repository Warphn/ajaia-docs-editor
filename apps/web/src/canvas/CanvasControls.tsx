import { AlertTriangle, Check, Crosshair, FileCode, FileDown, Lock, LockOpen, PenLine } from 'lucide-react';
import type { CanvasSaveStatus } from './use-canvas-autosave';

interface CanvasControlsProps {
  isLocked: boolean;
  canEdit: boolean;
  isDrawing: boolean;
  canvasSaveStatus: CanvasSaveStatus;
  /** Extra space on the right, in px, taken by Excalidraw's open sidebar. */
  rightOffset: number;
  onToggleDrawing: () => void;
  onToggleLock: () => void;
  onResetPosition: () => void;
  onPrint: () => void;
  onExportMarkdown: () => void;
}

/** Floating page controls, bottom-right (Excalidraw keeps its zoom/undo controls bottom-left). */
export function CanvasControls(props: CanvasControlsProps) {
  const { isLocked, canEdit, isDrawing, canvasSaveStatus, rightOffset } = props;
  const { onToggleDrawing, onToggleLock, onResetPosition, onPrint, onExportMarkdown } = props;
  const buttonClasses =
    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink';
  const edgeGap = 16;

  return (
    <div
      className="print-hidden absolute bottom-4 z-5 flex items-center gap-1 rounded-lg border border-line bg-sheet p-1 shadow-sm"
      style={{ right: edgeGap + rightOffset }}
    >
      {canvasSaveStatus === 'error' && (
        <span role="alert" className="flex items-center gap-1 px-2 text-xs text-danger">
          <AlertTriangle size={14} aria-hidden="true" />
          Drawings not saved
        </span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={onToggleDrawing}
          aria-pressed={isDrawing}
          title={isDrawing ? 'Back to writing (Esc)' : 'Show drawing tools to sketch on the canvas'}
          className={
            isDrawing
              ? 'inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-sm font-medium text-white hover:bg-primary-hover'
              : buttonClasses
          }
        >
          {isDrawing ? <Check size={15} aria-hidden="true" /> : <PenLine size={15} aria-hidden="true" />}
          {isDrawing ? 'Done drawing' : 'Draw'}
        </button>
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
      <button type="button" onClick={onPrint} className={buttonClasses} title="Print or save as PDF (A4, page only)">
        <FileDown size={15} aria-hidden="true" />
        Export PDF
      </button>
      <button type="button" onClick={onExportMarkdown} className={buttonClasses} title="Download as Markdown (.md)">
        <FileCode size={15} aria-hidden="true" />
        Markdown
      </button>
    </div>
  );
}
