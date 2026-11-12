import { describe, expect, it } from 'vitest';
import { nameWindowForLibraryReturns } from './library-return';

describe('nameWindowForLibraryReturns', () => {
  it('gives an unnamed tab a unique name so the library site can send libraries back to it', () => {
    const firstTab = { name: '' };
    const secondTab = { name: '' };

    nameWindowForLibraryReturns(firstTab);
    nameWindowForLibraryReturns(secondTab);

    expect(firstTab.name).toMatch(/^ajaia-docs-/);
    expect(secondTab.name).toMatch(/^ajaia-docs-/);
    expect(firstTab.name).not.toBe(secondTab.name);
  });

  it('keeps an existing name, so reopening the canvas in the same tab keeps the same target', () => {
    const tab = { name: 'ajaia-docs-existing' };

    nameWindowForLibraryReturns(tab);

    expect(tab.name).toBe('ajaia-docs-existing');
  });
});
