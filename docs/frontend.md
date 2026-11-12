# Frontend

React 19 + Vite + TypeScript + Tailwind CSS 4, in [`apps/web`](../apps/web). Editor: [TipTap 3](https://tiptap.dev) (ProseMirror).

## Structure

```
apps/web/src
  api/          fetch client (ApiError with status + code) and response types
  auth/         useCurrentUser / useLogin / useLogout, RequireAuth route guard
  hooks/        TanStack Query hooks for documents & shares, useDocumentAutosave
  editor/       TipTap extensions, toolbar
  components/   Button, Dialog (native <dialog>), ShareDialog, AppHeader, badges…
  pages/        LoginPage, DocumentsPage, EditorPage (lazy-loaded)
```

## State

- **Server state** lives in TanStack Query (documents list, document, shares, current user). Mutations invalidate the affected queries. On login/logout the whole cache is cleared so one user's data never shows for another.
- **Editor state** is owned by TipTap while a document is open. The document query uses `staleTime: Infinity` so a background refetch can never reset the cursor; after each save the cached copy is replaced with the server response.
- **URL state:** the active tab (`?tab=shared`) and the selected team (`?team=<id>`), so both are linkable and survive reloads.

## Team workspaces ([`DocumentsPage.tsx`](../apps/web/src/pages/DocumentsPage.tsx))

A row of pills above the list switches between **Personal** (the existing *My documents* / *Shared with me* tabs) and each team the user belongs to; **New team** creates one and selects it. In a team, the list shows every document of the team, the member avatars open a dialog to add colleagues by email ([`TeamDialogs.tsx`](../apps/web/src/components/TeamDialogs.tsx)), and **New document**, **From template** and **Import file** create the document in that team. Owned team documents also appear under *My documents* with a team label, so nothing disappears from the personal view. Creating, importing or deleting refreshes both personal and team lists.

## Autosave ([`use-document-autosave.ts`](../apps/web/src/hooks/use-document-autosave.ts))

- Edits (content and title) are merged into one pending change set and saved 800 ms after the last keystroke; `Ctrl/Cmd+S` saves immediately.
- One request in flight at a time; edits typed during a save are sent right after it.
- Each save sends the last known `version`. On **409** autosave stops and a banner asks the user to reload, instead of silently overwriting a collaborator.
- On network/server errors the change set is kept and a "Retry save" action is shown.
- Leaving the page with unsaved changes triggers the browser's confirmation; navigating inside the app flushes pending edits.

Status is always visible next to the title: *Saved / Unsaved changes / Saving… / Not saved / Out of date*.

## Access in the UI

The API decides access; the UI only reflects `document.access`:
- **viewer:** editor is read-only, toolbar hidden, "View only" badge and a note naming the owner.
- **editor:** full editing; share dialog lists people but cannot change them. Members of the document's team get this access.
- **owner:** share dialog can add people by email, change roles and remove access.

## Design

Engineering-paper look: the document is a white sheet on a dotted canvas; everything else is quiet. IBM Plex Sans (UI and content) and IBM Plex Mono (code). Color tokens are defined once in [`styles.css`](../apps/web/src/styles.css) (`@theme`). Lists of documents are table-like rows rather than card grids, so titles, owners and dates scan quickly.

Accessibility basics: semantic landmarks, labelled controls and icon buttons, `role="status"` for save state, `role="alert"` for errors, visible focus ring, native `<dialog>` (focus trap + Esc), reduced-motion respected, responsive down to 360 px.

## Canvas around the page

On screens ≥ 768 px the editor is an infinite whiteboard ([Excalidraw](https://github.com/excalidraw/excalidraw), MIT, lazy-loaded in its own chunk) with the document page floating on it ([`CanvasWorkspace.tsx`](../apps/web/src/canvas/CanvasWorkspace.tsx)).

- **Page as an overlay:** the page is normal DOM (so TipTap works unchanged) placed in canvas coordinates with `translate((page + scroll) × zoom) scale(zoom)` — the same math Excalidraw uses for its elements ([`page-geometry.ts`](../apps/web/src/canvas/page-geometry.ts)). It sits at z-index 3: above Excalidraw's canvases, below its toolbars. Wheel and Ctrl+wheel over the page are forwarded to the canvas so navigation feels the same everywhere; the dotted background moves and scales with the view.
- **Move / lock / reset:** drag the handle above the page; **Lock page** disables the handle (a per-browser preference in `localStorage`, so it never affects collaborators); **Reset position** puts the page back at the origin and recenters. The page position is saved with the drawings, so the layout survives reloads.
- **Writing vs drawing mode:** by default Excalidraw runs in view mode with its toolbars hidden (`data-drawing="false"`), so the canvas is calm while writing. **Draw** shows the tools; **Done drawing**, Esc (once nothing is selected) or clicking the page goes back.
- **Include in document:** drag selected drawings onto the page (detected with Excalidraw's `onPointerUp` + `pointerDownState`; the page is highlighted while hovering and the originals are restored to where they were), or use the chip. The selection (expanded to bound text and group members) is exported with `exportToSvg` (fonts inlined) and inserted **between blocks** at the drop point (upper half of a block → before it, lower half → after it), never splitting a paragraph.
- **Include / remove toggle:** each inclusion gets a drawing id stored in the elements' `customData` and in the image (`data-drawing-id`). Selecting those elements again turns the chip into **Remove from document**; dropping an included drawing again moves it instead of duplicating. The image is a static snapshot: edit on the canvas and include again.
- **Cursor following:** typing near the bottom pans the canvas (`handleScrollToSelection`) instead of letting the browser scroll elements; the workspace uses `overflow: clip` so it can never be scrolled out of place.
- **Persistence:** debounced autosave (1 s) of elements + pasted images + page position; a fingerprint of element versions avoids saving on pointer moves and selection changes. Viewers get Excalidraw's view mode.
- **Shape library:** Excalidraw's library works, including **Browse libraries**: libraries.excalidraw.com sends the user back to the document with `#addLibrary=<url>`, which `useHandleLibrary` picks up. Each tab gets a unique `window.name` ([`library-return.ts`](../apps/web/src/canvas/library-return.ts)), which Excalidraw passes to the site as the return target, so "Add to Excalidraw" lands in the **same tab** as a hash change: no reload, no new tab, no confirm prompt, and the library tab stays open for adding more. If the return does open a fresh tab, the item is confirmed with a prompt and the canvas opens in drawing mode so the sidebar is visible. Items are kept per browser in `localStorage` ([`library-storage.ts`](../apps/web/src/canvas/library-storage.ts)) and are available in every document. While the sidebar is open, the page controls move left of it so they never cover its footer.
- **Keyboard and clipboard isolation:** Excalidraw only listens to keys inside its own container and ignores paste when focus is elsewhere, so typing in the page never triggers drawing shortcuts.
- **Export PDF:** `window.print()` with a print stylesheet that hides the app chrome and the whole canvas; the document title becomes the PDF file name.

## Pages: what you see is what you export

The sheet is **A4 (210 mm) with 25 mm margins** on screen and in print ([`page-format.ts`](../apps/web/src/editor/page-format.ts)), so lines wrap at the same place. A `ResizeObserver` counts how many 247 mm content areas the text fills and draws dashed **page-break guides** where the PDF will start a new page ([`PageBreakGuides.tsx`](../apps/web/src/editor/PageBreakGuides.tsx)); the sheet grows a whole page at a time. In print, `@page { size: A4; margin: 0 }` removes the browser's header/footer (date, URL, page count) and the sheet's padding is repeated on every page with `box-decoration-break: clone`. Verified by generating PDFs with headless Chrome: the first line after each guide is the first line of the next PDF page. Caveat: an image that does not fit at the bottom of a page moves to the next one, shifting later breaks slightly.

## Fonts

TipTap's `TextStyle` + `FontFamily` with six options ([`font-options.ts`](../apps/web/src/editor/font-options.ts)): the default IBM Plex Sans, Arial, Times New Roman, Georgia, Courier New (installed on Windows/macOS) and Roboto (Google Fonts). Stored as `<span style="font-family: …">`; the API sanitizer accepts only font names in that style.

## Diagrams

A custom TipTap node ([`mermaid-diagram-extension.ts`](../apps/web/src/editor/mermaid/mermaid-diagram-extension.ts)) stores only the Mermaid **source** as `<div data-type="mermaid" data-source="…">`; the SVG is rendered on display. Editors open a dialog with source and live preview (debounced 300 ms) and starter examples; invalid syntax shows the parser error instead of breaking the document. Mermaid runs with `securityLevel: "strict"`, is loaded on demand (only when a document contains a diagram), and renders through a queue because it keeps global state.

## Bundle

The editor route is code-split with `React.lazy`: initial JS ≈ 100 kB gzip; TipTap (≈ 142 kB gzip) loads only when a document is opened, Excalidraw (≈ 347 kB gzip) only in the canvas layout, and Mermaid only when a document contains a diagram.

**One React copy:** Excalidraw depends on a package whose peer range stops at React 18, which made npm install React 18 at the workspace root next to the app's React 19 — two Reacts in one bundle break hooks. The root `package.json` pins `react`/`react-dom` 19 so a single copy is installed, and `resolve.dedupe` in [`vite.config.ts`](../apps/web/vite.config.ts) guards the bundle.
