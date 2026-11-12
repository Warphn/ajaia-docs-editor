import type { LibraryPersistedData, LibraryPersistenceAdapter } from '@excalidraw/excalidraw/data/library';

export const LIBRARY_STORAGE_KEY = 'ajaia:excalidraw-library';

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps the Excalidraw shape library (items saved by hand or installed from libraries.excalidraw.com)
 * in this browser. The library is a personal toolbox, not document data, so it is shared by every
 * document the user opens here and never sent to the API.
 */
export function createLibraryStorageAdapter(storage: Storage | null = browserStorage()): LibraryPersistenceAdapter {
  return {
    load() {
      try {
        const storedValue = storage?.getItem(LIBRARY_STORAGE_KEY);
        if (!storedValue) {
          return null;
        }
        const parsed = JSON.parse(storedValue) as Partial<LibraryPersistedData>;
        return Array.isArray(parsed.libraryItems) ? { libraryItems: parsed.libraryItems } : null;
      } catch {
        // Unreadable or unavailable storage must not break the canvas; start with an empty library.
        return null;
      }
    },
    async save(libraryData) {
      if (!storage) {
        throw new Error('Browser storage is unavailable');
      }
      // Errors propagate on purpose: Excalidraw then tells the user the library could not be saved.
      storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify({ libraryItems: libraryData.libraryItems }));
    },
  };
}
