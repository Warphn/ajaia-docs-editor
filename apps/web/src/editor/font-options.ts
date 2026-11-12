/**
 * Fonts offered in the toolbar: the families most used in business documents.
 * Arial, Times New Roman, Georgia and Courier New ship with Windows and macOS; Roboto is loaded
 * from Google Fonts (index.html). The empty value means the document default (IBM Plex Sans).
 */
export const FONT_OPTIONS = [
  { label: 'Default (IBM Plex Sans)', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
] as const;

/** The sanitizer may drop the space after commas, so compare font stacks by their first family only. */
export function findFontOption(fontFamily: string | null | undefined) {
  if (!fontFamily) {
    return FONT_OPTIONS[0];
  }
  const firstFamily = (stack: string) => stack.split(',')[0]?.replace(/['"]/g, '').trim().toLowerCase();
  return FONT_OPTIONS.find((option) => option.value && firstFamily(option.value) === firstFamily(fontFamily)) ?? FONT_OPTIONS[0];
}
