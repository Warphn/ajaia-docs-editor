import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { SaveStatus } from '../hooks/use-document-autosave';

export function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <span role="status" aria-live="polite" className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
      {status === 'saved' && (
        <>
          <Check size={14} className="text-success" aria-hidden="true" />
          Saved
        </>
      )}
      {status === 'unsaved' && 'Unsaved changes'}
      {status === 'saving' && (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Saving…
        </>
      )}
      {status === 'error' && (
        <>
          <AlertTriangle size={14} className="text-danger" aria-hidden="true" />
          <span className="text-danger">Not saved</span>
        </>
      )}
      {status === 'conflict' && (
        <>
          <AlertTriangle size={14} className="text-warning" aria-hidden="true" />
          <span className="text-warning">Out of date</span>
        </>
      )}
    </span>
  );
}
