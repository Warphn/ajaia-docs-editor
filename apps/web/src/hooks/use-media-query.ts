import { useSyncExternalStore } from 'react';

/** Re-renders when the media query starts or stops matching (e.g. resizing below a breakpoint). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
