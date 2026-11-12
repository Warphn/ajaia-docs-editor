/**
 * Excalidraw's "Browse libraries" link sends `window.name` (or "_blank" when it is empty) as the
 * target where libraries.excalidraw.com opens "Add to Excalidraw". With a name, the site sends the
 * library back to this tab as a hash change (`#addLibrary=…`): the page does not reload and the
 * library installs live, instead of opening another copy of the document in a new tab.
 *
 * The name is unique per tab, so two open documents never receive each other's libraries.
 */
export function nameWindowForLibraryReturns(currentWindow: Pick<Window, 'name'> = window) {
  if (!currentWindow.name) {
    currentWindow.name = `ajaia-docs-${crypto.randomUUID()}`;
  }
}
