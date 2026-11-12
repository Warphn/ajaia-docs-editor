import { describe, expect, it } from 'vitest';
import { createLibraryStorageAdapter, LIBRARY_STORAGE_KEY } from './library-storage';

function createMemoryStorage(initialEntries: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initialEntries));
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, value),
  };
}

const sampleItem = { id: 'item-1', status: 'published', elements: [], created: 1 };

describe('createLibraryStorageAdapter', () => {
  it('returns null when nothing was saved yet', async () => {
    const adapter = createLibraryStorageAdapter(createMemoryStorage());

    expect(await adapter.load({ source: 'load' })).toBeNull();
  });

  it('loads the library items it saved', async () => {
    const storage = createMemoryStorage();
    const adapter = createLibraryStorageAdapter(storage);

    await adapter.save({ libraryItems: [sampleItem] as never });

    expect(await adapter.load({ source: 'load' })).toEqual({ libraryItems: [sampleItem] });
    expect(storage.getItem(LIBRARY_STORAGE_KEY)).not.toBeNull();
  });

  it('returns null instead of failing when the stored value is corrupted', async () => {
    const adapter = createLibraryStorageAdapter(createMemoryStorage({ [LIBRARY_STORAGE_KEY]: '{not json' }));

    expect(await adapter.load({ source: 'load' })).toBeNull();
  });

  it('returns null when the stored value has no library items', async () => {
    const adapter = createLibraryStorageAdapter(createMemoryStorage({ [LIBRARY_STORAGE_KEY]: '{"other":1}' }));

    expect(await adapter.load({ source: 'load' })).toBeNull();
  });

  it('returns null when storage is unavailable', async () => {
    const adapter = createLibraryStorageAdapter(null);

    expect(await adapter.load({ source: 'load' })).toBeNull();
  });

  it('throws when saving fails so the canvas can show its "could not save library" message', async () => {
    const fullStorage = createMemoryStorage();
    fullStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const adapter = createLibraryStorageAdapter(fullStorage);

    await expect(adapter.save({ libraryItems: [sampleItem] as never })).rejects.toThrow('QuotaExceededError');
  });
});
