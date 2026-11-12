import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { DocumentChanges, DocumentDetail } from '../api/types';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

export const AUTOSAVE_DELAY_MS = 800;

interface AutosaveOptions {
  documentId: string;
  initialVersion: number;
  onSaved?: (document: DocumentDetail) => void;
}

function hasChanges(changes: DocumentChanges): boolean {
  return changes.title !== undefined || changes.contentHtml !== undefined;
}

/**
 * Debounced autosave with a single request in flight at a time.
 * Every save sends the last known version; a 409 means someone else saved first, so autosave stops
 * (status "conflict") instead of overwriting their work.
 */
export function useDocumentAutosave({ documentId, initialVersion, onSaved }: AutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const versionRef = useRef(initialVersion);
  const pendingChangesRef = useRef<DocumentChanges>({});
  const debounceTimerRef = useRef<number | undefined>(undefined);
  const isSavingRef = useRef(false);
  const hasConflictRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const saveNow = useCallback(async (): Promise<void> => {
    window.clearTimeout(debounceTimerRef.current);
    if (isSavingRef.current || hasConflictRef.current || !hasChanges(pendingChangesRef.current)) {
      return;
    }

    const changesToSave = pendingChangesRef.current;
    pendingChangesRef.current = {};
    isSavingRef.current = true;
    setStatus('saving');

    try {
      const savedDocument = await api.updateDocument(documentId, { ...changesToSave, version: versionRef.current });
      versionRef.current = savedDocument.version;
      isSavingRef.current = false;
      setErrorMessage(null);
      onSavedRef.current?.(savedDocument);

      // Changes typed while the request was in flight are saved right away.
      if (hasChanges(pendingChangesRef.current)) {
        setStatus('unsaved');
        void saveNow();
      } else {
        setStatus('saved');
      }
    } catch (error) {
      isSavingRef.current = false;
      // Keep what failed so it is retried with the next save; newer edits take precedence.
      pendingChangesRef.current = { ...changesToSave, ...pendingChangesRef.current };

      if (error instanceof ApiError && error.status === 409) {
        hasConflictRef.current = true;
        setStatus('conflict');
      } else {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Could not save your changes.');
      }
    }
  }, [documentId]);

  const queueChange = useCallback(
    (change: DocumentChanges) => {
      pendingChangesRef.current = { ...pendingChangesRef.current, ...change };
      if (hasConflictRef.current) {
        return;
      }
      setStatus('unsaved');
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    },
    [saveNow],
  );

  // Flush pending edits when leaving the editor (e.g. clicking back to the document list).
  useEffect(() => () => void saveNow(), [saveNow]);

  // Warn before closing the tab while edits are not yet stored.
  useEffect(() => {
    if (status === 'saved') {
      return;
    }
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [status]);

  return { status, errorMessage, queueChange, saveNow };
}
