import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

/** Also read by the inline script in index.html, which applies the theme before the first paint. */
export const THEME_STORAGE_KEY = 'ajaia-theme';
const THEME_CHANGE_EVENT = 'ajaia-theme-change';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** The theme the user picked, or null when they never chose one (then the system setting applies). */
export function readStoredTheme(): Theme | null {
  try {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedValue === 'light' || storedValue === 'dark' ? storedValue : null;
  } catch {
    // Storage can be unavailable (private mode, blocked site data): fall back to the system setting.
    return null;
  }
}

export function resolveTheme(storedTheme: Theme | null, systemPrefersDark: boolean): Theme {
  return storedTheme ?? (systemPrefersDark ? 'dark' : 'light');
}

function systemPrefersDark() {
  return window.matchMedia?.(DARK_SCHEME_QUERY).matches ?? false;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // Native controls (scrollbars, selects, dialogs) follow the page theme.
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function getCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not remembered across visits, but still applied to this page.
  }
  applyTheme(theme);
}

/** Applies the theme on startup and keeps following the system setting until the user picks one. */
export function initializeTheme() {
  applyTheme(resolveTheme(readStoredTheme(), systemPrefersDark()));
  window.matchMedia?.(DARK_SCHEME_QUERY).addEventListener('change', (event) => {
    if (readStoredTheme() === null) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
}

function subscribe(onThemeChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
}

/** Current theme for components that must pass it on (e.g. Excalidraw), plus a toggle. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getCurrentTheme);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}
