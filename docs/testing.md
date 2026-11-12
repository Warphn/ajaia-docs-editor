# Testing

```bash
npm test            # all suites (API + web), from the repository root
npm run typecheck   # strict TypeScript for both apps
```

No database or browser setup is needed: API integration tests run against an in-memory Postgres (PGlite).

## Strategy

Test where the risk is: access control, data integrity and the save loop. UI rendering is verified manually (see below) because it changes fastest and breaks least silently.

| Layer | File | What it proves |
|---|---|---|
| Unit | [`access-control.test.ts`](../apps/api/src/lib/access-control.test.ts) | Owner/editor/viewer/no-access resolution, team members get edit access (stronger than a view-only share), each permission check |
| Unit | [`sanitize-html.test.ts`](../apps/api/src/lib/sanitize-html.test.ts) | Supported formatting survives; `<del>` becomes `<s>`; only `language-*` classes kept on `<code>`; scripts, event handlers and `javascript:` links are removed; embedded `data:image/*` images kept, remote/HTML/script image sources removed; only font-family styles kept; drawing ids kept |
| Unit | [`file-to-html.test.ts`](../apps/api/src/modules/imports/file-to-html.test.ts) | .txt/.md/.docx conversion (a real .docx is built in memory), ` ```mermaid ` fences become diagram blocks, 415/400 errors |
| Integration | [`documents-and-sharing.test.ts`](../apps/api/test/documents-and-sharing.test.ts) | Full flow through HTTP + SQL: login, create, save, reopen, 409 on stale version, share as viewer (read OK, edit 403), upgrade to editor, non-owner cannot share/delete, unrelated user gets 404, revoke, delete |
| Integration | [`import.test.ts`](../apps/api/test/import.test.ts) | Multipart upload creates an owned document; sanitization of imported HTML; 413, 415, 401 |
| Unit | [`template-catalog.test.ts`](../apps/api/src/modules/templates/template-catalog.test.ts) | Every template only uses markup the editor supports (unchanged by the sanitizer), ids are unique |
| Integration | [`templates.test.ts`](../apps/api/test/templates.test.ts) | Listing, creating from a template (title + content), explicit title wins, unknown template → 400 |
| Integration | [`canvas.test.ts`](../apps/api/test/canvas.test.ts) | Canvas load/save, viewer read-only (403), no access (404), invalid scene (400), size limit (413), canvas never included in the document payload |
| Integration | [`teams.test.ts`](../apps/api/test/teams.test.ts) | Seeded demo teams, create (name trimmed, empty → 400), add member by email (duplicate → 400, unknown email → 404, non-member → 404), create a document in a team (non-member → 404), members list and edit team documents without a share, non-members get 404 |
| Integration | [`health.test.ts`](../apps/api/test/health.test.ts) | App boots, OpenAPI document is served |
| Unit (web) | [`canvas-helpers.test.ts`](../apps/web/src/canvas/canvas-helpers.test.ts) | Page placement/drag math matches Excalidraw's, reset centering, selection export includes bound text and groups, drawing id shared by a selection, restoring dragged elements, save fingerprint ignores non-persistent changes |
| Unit (web) | [`library-storage.test.ts`](../apps/web/src/canvas/library-storage.test.ts) | Shape library round-trips through browser storage; empty, corrupted or unavailable storage loads as an empty library; a failed save throws so Excalidraw can report it |
| Unit (web) | [`library-return.test.ts`](../apps/web/src/canvas/library-return.test.ts) | Each tab gets a unique window name (the library site's return target); an existing name is kept |
| Unit (web) | [`export-markdown.test.ts`](../apps/web/src/editor/export-markdown.test.ts) | Headings, inline formatting, strikethrough, underline as `<u>`, tight and nested lists, Mermaid blocks as ` ```mermaid ` fences, code-block language, links/quotes/rules/images, font wrappers dropped; safe file names with a fallback |
| Component (web) | [`ExportMenu.test.tsx`](../apps/web/src/components/ExportMenu.test.tsx) | Runs the chosen export and closes; Esc closes without exporting |
| Unit (web) | [`theme.test.ts`](../apps/web/src/theme/theme.test.ts) | A stored choice beats the system setting; no choice follows the system; invalid or unavailable storage falls back; applying a theme sets `data-theme` and `color-scheme` even when it cannot be stored |
| Component (web) | [`ConfirmDialog.test.tsx`](../apps/web/src/components/ConfirmDialog.test.tsx) | Confirm runs the action, Cancel does not, buttons disabled with a pending label while the action runs, failure message shown |
| Unit (web) | [`use-document-autosave.test.ts`](../apps/web/src/hooks/use-document-autosave.test.ts) | Debounce batching, version chaining, stop on 409, retry after network error |

Integration tests use Fastify's `inject` (no open ports) on the real app built by `buildApp`.

## Against a real Postgres

The production driver (postgres-js) differs from PGlite, so the same integration suite can target a server:

```bash
docker run -d --rm --name ajaia-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ajaia -p 55432:5432 postgres:17-alpine
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/ajaia npm test -w apps/api -- --no-file-parallelism
```

All suites pass on Postgres 17 as well.

## Manual verification

A headless-Chrome walkthrough (Playwright driving the built app) covered: one-click demo login, creating a document, formatting via keyboard shortcuts, autosave reaching "Saved", sharing as viewer, reload preserving `<strong>` and lists, the recipient seeing it under "Shared with me" and getting a read-only editor, and mobile layout at 390 px. A second scripted run covered diagrams: insert, edit via the dialog, invalid syntax showing the parser error, save, reload (stored as Mermaid source), and importing a `.md` with a mermaid fence. It caught a real bug in the first run: on mobile the header squeezed the title field to zero width (fixed by a compact header).

A third scripted run covered the canvas: draw on the canvas, include by click and by drag-and-drop, move the page by its handle, lock (page stays), reset (back to origin), reload (drawings, page and images persist), print media and a generated PDF containing only the page, the viewer's read-only canvas, and the classic layout at 390 px. It caught a real bug: npm had installed a second React, so the app crashed on load (fixed by pinning a single React 19).

A fourth run covered the second round of feedback: toolbar hidden in writing mode and shown in drawing mode, Esc/page click return to writing, include → remove toggle, dragging the drawing itself onto the page (original stays in place, paragraph not split), font applied to a selection and to new text and persisted, and **page guides compared with a real PDF** (the line after the guide starts page 2). It caught two real bugs: the browser scrolled the whole workspace when the caret moved below the fold (fixed with `overflow: clip` + canvas panning), and drops split paragraphs (fixed by inserting between blocks).

The same flow was re-run against the live deployment (owner creates and formats a document, shares it as view-only, reload preserves formatting, recipient gets a read-only editor), then the test document was deleted.
