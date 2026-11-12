import { useCallback, useState } from 'react';

const storageKey = (documentId: string) => `ajaia:page-locked:${documentId}`;

function readLock(documentId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(documentId)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Whether the page can be dragged. A personal view preference (kept in this browser),
 * not document data, so locking never affects collaborators.
 */
export function usePageLock(documentId: string) {
  const [isLocked, setIsLocked] = useState(() => readLock(documentId));

  const toggleLock = useCallback(() => {
    setIsLocked((wasLocked) => {
      const nowLocked = !wasLocked;
      try {
        window.localStorage.setItem(storageKey(documentId), String(nowLocked));
      } catch {
        // Storage can be unavailable (private mode); the lock still works for this session.
      }
      return nowLocked;
    });
  }, [documentId]);

  return { isLocked, toggleLock };
}
