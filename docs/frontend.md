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
- **URL state:** the active tab (`?tab=shared`) so "Shared with me" is linkable.

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
- **editor:** full editing; share dialog lists people but cannot change them.
- **owner:** share dialog can add people by email, change roles and remove access.

## Design

Engineering-paper look: the document is a white sheet on a dotted canvas; everything else is quiet. IBM Plex Sans (UI and content) and IBM Plex Mono (code). Color tokens are defined once in [`styles.css`](../apps/web/src/styles.css) (`@theme`). Lists of documents are table-like rows rather than card grids, so titles, owners and dates scan quickly.

Accessibility basics: semantic landmarks, labelled controls and icon buttons, `role="status"` for save state, `role="alert"` for errors, visible focus ring, native `<dialog>` (focus trap + Esc), reduced-motion respected, responsive down to 360 px.

## Canvas around the page

On screens ≥ 768 px the editor is an infinite whiteboard ([Excalidraw](https://github.com/excalidraw/excalidraw), MIT, lazy-loaded in its own chunk) with the document page floating on it ([`CanvasWorkspace.tsx`](../apps/web/src/canvas/CanvasWorkspace.tsx)).

- **Page as an overlay:** the page is normal DOM (so TipTap works unchanged) placed in canvas coordinates with `translate((page + scroll) × zoom) scale(zoom)` — the same math Excalidraw uses for its elements ([`page-geometry.ts`](../apps/web/src/canvas/page-geometry.ts)). It sits at z-index 3: above Excalidraw's canvases, below its toolbars. Wheel and Ctrl+wheel over the page are forwarded to the canvas so navigation feels the same everywhere; the dotted background moves and scales with the view.
- **Move / lock / reset:** drag the handle above the page; **Lock page** disables the handle (a per-browser preference in `localStorage`, so it never affects collaborators); **Reset position** puts the page back at the origin and recenters. The page position is saved with the drawings, so the layout survives reloads.
- **Include in document:** selecting drawings shows a chip. Click → the selection (expanded to bound text and group members) is exported with `exportToSvg` (fonts inlined) and inserted as an image at the cursor; drag the chip onto the page → inserted where it is dropped (`handleDrop` + `posAtCoords`). The drawing stays on the canvas to be edited and included again; the inserted image is a static snapshot.
- **Persistence:** debounced autosave (1 s) of elements + pasted images + page position; a fingerprint of element versions avoids saving on pointer moves and selection changes. Viewers get Excalidraw's view mode.
- **Keyboard and clipboard isolation:** Excalidraw only listens to keys inside its own container and ignores paste when focus is elsewhere, so typing in the page never triggers drawing shortcuts.
- **Export PDF:** `window.print()` with a print stylesheet that hides the app chrome and the whole canvas and lays the page out normally; the document title becomes the PDF file name.

## Diagrams

A custom TipTap node ([`mermaid-diagram-extension.ts`](../apps/web/src/editor/mermaid/mermaid-diagram-extension.ts)) stores only the Mermaid **source** as `<div data-type="mermaid" data-source="…">`; the SVG is rendered on display. Editors open a dialog with source and live preview (debounced 300 ms) and starter examples; invalid syntax shows the parser error instead of breaking the document. Mermaid runs with `securityLevel: "strict"`, is loaded on demand (only when a document contains a diagram), and renders through a queue because it keeps global state.

## Bundle

The editor route is code-split with `React.lazy`: initial JS ≈ 100 kB gzip; TipTap (≈ 142 kB gzip) loads only when a document is opened, Excalidraw (≈ 347 kB gzip) only in the canvas layout, and Mermaid only when a document contains a diagram.

**One React copy:** Excalidraw depends on a package whose peer range stops at React 18, which made npm install React 18 at the workspace root next to the app's React 19 — two Reacts in one bundle break hooks. The root `package.json` pins `react`/`react-dom` 19 so a single copy is installed, and `resolve.dedupe` in [`vite.config.ts`](../apps/web/vite.config.ts) guards the bundle.
