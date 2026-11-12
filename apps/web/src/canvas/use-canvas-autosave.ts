import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { CanvasScene } from '../api/types';

export type CanvasSaveStatus = 'saved' | 'saving' | 'error';

const CANVAS_AUTOSAVE_DELAY_MS = 1000;

/**
 * Debounced, fingerprint-deduplicated canvas saves (one request in flight at a time).
 * The canvas is last-write-wins on the server, so there is no version to track.
 */
export function useCanvasAutosave(documentId: string, initialFingerprint: string) {
  const [status, setStatus] = useState<CanvasSaveStatus>('saved');
  const savedFingerprintRef = useRef(initialFingerprint);
  const pendingRef = useRef<{ scene: CanvasScene; fingerprint: string } | null>(null);
  const debounceTimerRef = useRef<number | undefined>(undefined);
  const isSavingRef = useRef(false);

  const saveNow = useCallback(async (): Promise<void> => {
    window.clearTimeout(debounceTimerRef.current);
    const pending = pendingRef.current;
    if (isSavingRef.current || !pending) {
      return;
    }
    pendingRef.current = null;
    isSavingRef.current = true;
    setStatus('saving');
    try {
      await api.saveCanvas(documentId, pending.scene);
      savedFingerprintRef.current = pending.fingerprint;
      isSavingRef.current = false;
      if (pendingRef.current) {
        void saveNow();
      } else {
        setStatus('saved');
      }
    } catch {
      isSavingRef.current = false;
      // Keep the newest scene for the next attempt.
      pendingRef.current ??= pending;
      setStatus('error');
    }
  }, [documentId]);

  const queueScene = useCallback(
    (scene: CanvasScene, fingerprint: string) => {
      if (fingerprint === savedFingerprintRef.current && !pendingRef.current) {
        return;
      }
      pendingRef.current = { scene, fingerprint };
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => void saveNow(), CANVAS_AUTOSAVE_DELAY_MS);
    },
    [saveNow],
  );

  // Flush when leaving the editor.
  useEffect(() => () => void saveNow(), [saveNow]);

  return { status, queueScene, saveNow };
}
