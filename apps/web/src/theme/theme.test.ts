import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentTheme, readStoredTheme, resolveTheme, setTheme, THEME_STORAGE_KEY } from './theme';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('resolveTheme', () => {
  it('uses the theme the user picked, whatever the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system setting when the user never picked a theme', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
});

describe('readStoredTheme', () => {
  it('ignores values that are not a theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');

    expect(readStoredTheme()).toBeNull();
  });

  it('returns null when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredTheme()).toBeNull();
  });
});

describe('setTheme', () => {
  it('applies the theme to the page and remembers it', () => {
    setTheme('dark');

    expect(getCurrentTheme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('still applies the theme when it cannot be stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    setTheme('dark');

    expect(getCurrentTheme()).toBe('dark');
  });
});
