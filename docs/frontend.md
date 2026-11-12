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

## Bundle

The editor route is code-split with `React.lazy`: initial JS ≈ 100 kB gzip; TipTap (≈ 133 kB gzip) loads only when a document is opened.
