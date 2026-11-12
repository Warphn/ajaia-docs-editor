# Decision log

Each entry: decision, alternatives considered, tradeoff, reason.

### 1. Target tech teams; core first, differentiators second
- **Decision:** Position the product for product/engineering teams. Build the full core (editing, import, sharing, persistence, deploy) before any differentiator. Differentiators: document templates, then Mermaid diagrams.
- **Alternatives:** Generic editor; or lead with differentiators.
- **Tradeoff:** Fewer "wow" features early; a narrower audience.
- **Reason:** The brief values a coherent slice and warns against sacrificing core for stretch work. A specific audience makes feature choices easy to justify (templates for specs/RFCs/postmortems; diagrams-as-code that engineers already use).

### 2. TypeScript end to end, npm workspaces monorepo, single deployable
- **Alternatives:** Next.js full stack; separate frontend and backend deployments.
- **Tradeoff:** The API also has to serve static files.
- **Reason:** One URL, no CORS, same-origin httpOnly cookies, one deploy to keep alive on a free tier. A standalone Fastify API keeps the API contract explicit and documentable with Swagger, which Next.js route handlers make clumsier.

### 3. Fastify + Zod type provider
- **Alternatives:** Express + hand-written OpenAPI; NestJS.
- **Tradeoff:** Less familiar to some reviewers than Express.
- **Reason:** One Zod schema per route gives request validation, TypeScript types and the OpenAPI document, so Swagger cannot drift from behavior. NestJS is heavier than this scope needs.

### 4. Postgres everywhere: managed Postgres in production, embedded PGlite locally and in tests
- **Alternatives:** SQLite (simple, but file storage is wiped on Render's free tier); Postgres in Docker for local development; mocked repositories in tests.
- **Tradeoff:** Two drivers (postgres-js and PGlite) behind one Drizzle interface.
- **Reason:** Reviewers run the project with zero setup; tests exercise real SQL (constraints, cascades, `ON CONFLICT`) instead of mocks; production gets a durable managed database at no cost. Driver parity is checked by running the integration suite against Postgres 17 too ([testing](./testing.md#against-a-real-postgres)).

### 5. Store content as sanitized HTML
- **Alternatives:** TipTap/ProseMirror JSON; Markdown.
- **Tradeoff:** HTML is less structured than JSON for programmatic edits.
- **Reason:** One format shared by the editor (`getHTML`/`setContent`), importers (marked and mammoth output HTML), templates and future export. Formatting round-trips exactly. Because shared documents render in other people's browsers, the server sanitizes with an allowlist that mirrors the editor's features (stored-XSS protection). Markdown would lose underline.

### 6. Seeded accounts + real login; no sign-up
- **Alternatives:** A "switch user" dropdown with no auth; full sign-up and password reset.
- **Tradeoff:** Reviewers can only use three accounts.
- **Reason:** A real session (bcrypt + JWT in an httpOnly cookie) makes the access rules meaningful and testable. The login page offers one-click sign-in per demo user, so it costs reviewers nothing. Sign-up adds flows (validation, email uniqueness UX, reset) that don't demonstrate anything new.

### 7. Sharing by email with viewer/editor roles; 404 for no access
- **Alternatives:** Single "has access" flag; share links; 403 for unauthorized reads.
- **Tradeoff:** Roles add a little UI and enforcement code.
- **Reason:** Read-only sharing is the first thing corporate teams ask for (status updates to management, specs to clients). Ownership stays a column (exactly one owner); shares are rows. Returning 404 instead of 403 for documents you can't see avoids confirming that a private document exists.

### 8. Autosave with optimistic concurrency; no real-time collaboration
- **Alternatives:** Manual save button; last-write-wins; Yjs/CRDT with WebSockets.
- **Tradeoff:** Simultaneous editors don't merge; the second one is asked to reload.
- **Reason:** Real-time co-editing is a project of its own (CRDT, presence, a WebSocket server, persistence of updates) and would put the core at risk within 4–6 hours. A `version` column plus `UPDATE … WHERE version = ?` makes silent overwrites impossible, which is what really matters for data safety.

### 9. File upload = import as a new document (.txt, .md, .docx, ≤ 5 MB)
- **Alternatives:** Attachments stored per document; import into an existing draft.
- **Tradeoff:** Images and table layout from .docx are dropped.
- **Reason:** Teams already have drafts in Word/Markdown; turning them into editable, shareable documents is the most useful product behavior, and it reuses the same content pipeline (convert → sanitize → store). Attachments would need object storage, which free hosting lacks.

### 10. Render free web service + Render free Postgres, both in one blueprint
- **Alternatives:** Vercel (serverless functions + separate DB); Fly.io/Railway (no longer free); Neon as an external database (first choice in the plan, but its sign-up now routes through a Vercel integration, which adds another account and manual wiring).
- **Tradeoff:** Cold start of ~50 s after idling; the free database expires 30 days after creation.
- **Reason:** Zero cost, one account, and one click: `render.yaml` creates the database and the service and wires `DATABASE_URL` itself, so the deploy is fully reproducible from the repo. 30 days covers the review window, and the app accepts any Postgres through `DATABASE_URL` if it needs to outlive it.

### 11. Small UI choices
- Native `<dialog>` for modals: focus trapping and Esc come from the browser, no library needed.
- Editor route lazy-loaded: the login page and list load ≈ 100 kB gzip instead of ≈ 230 kB.
- Latest stable libraries at the time of writing (TypeScript 7, Zod 4, React 19, Vite 8, TipTap 3). APIs were checked against the installed packages' own docs and types before use.

### 12. Templates live in code, not in the database
- **Alternatives:** A `templates` table with an admin UI; user-defined templates.
- **Tradeoff:** Adding a template needs a deploy.
- **Reason:** Five curated templates cover the recurring tech-team documents (spec, RFC, client announcement, management update, postmortem). In code they are reviewed like any change and a unit test guarantees each one renders exactly in the editor. User-defined templates ("save as template") are a natural next step.

### 13. Diagrams as Mermaid source, not drawings
- **Alternatives:** Embedding Excalidraw (freehand whiteboard); storing rendered SVG/PNG.
- **Tradeoff:** No freehand drawing; users write a small text syntax (mitigated by starter examples and live preview).
- **Reason:** Engineers already write Mermaid (GitHub renders it), the source is plain text that survives sanitization and diffs, and the library is loaded on demand. Excalidraw would add ~1–2 MB and a canvas-based data model. Storing only the source means diagrams always re-render with current styles; ` ```mermaid ` fences in imported Markdown become diagrams for free.

### 14. Canvas around the page with Excalidraw
- **Context:** after shipping, the Mermaid dialog proved impractical for quick sketches; the product owner asked for an Excalidraw-like canvas using the dotted background, with drag/click to include drawings, a movable page (lock/reset) and page-only printing.
- **Decision:** embed `@excalidraw/excalidraw` as the background and render the page as a DOM overlay positioned with the canvas' scroll/zoom. Reverses the earlier "no Excalidraw" call (decision 13): the cost (≈ 347 kB gzip) is now justified by an explicit product need and is paid only when the canvas opens.
- **Alternatives:** a hand-built SVG drawing tool (hours of work for a worse result); rendering the page inside Excalidraw as an embeddable/iframe (the rich-text editor would lose focus handling and selection).
- **Tradeoffs:** the canvas is **last-write-wins** (no merge between simultaneous editors); included drawings are **static images** (edit on the canvas and include again); below 768 px the classic layout is used.
- **Storage:** the scene is a `jsonb` column on `documents`, saved through its own endpoint and excluded from document queries. Included drawings are SVG `data:` URIs inside the HTML, so sharing, printing and export need no extra storage or access rules; the sanitizer only accepts `data:image/*` sources.
- **Page lock** is a per-browser preference, not document data, so one person locking the page never blocks a collaborator.

### 15. A4 pages with guides instead of true pagination
- **Context:** the product owner could not tell where the PDF would break pages on an infinite page, and the browser added its own header/footer to the PDF.
- **Decision:** make the on-screen sheet exactly the printed page (A4, 25 mm margins, same fonts) and draw page-break guides at every 247 mm of content; print with `@page { margin: 0 }` (no browser header/footer) and cloned padding on each page.
- **Alternatives:** true paginated editing (separate page boxes, content reflow — Google Docs-level layout engine); generating PDFs with a library (pdfmake/jsPDF) or server-side headless Chrome.
- **Tradeoff:** guides are exact for text but can drift when an image is pushed to the next page; page size is fixed to A4 (product owner's choice).
- **Reason:** the browser is the same layout engine for editing and printing, so what is on screen is what is exported, at no extra cost. A PDF library would lay out text differently than the editor, and server-side Chrome does not fit a free 512 MB instance.

### 16. Drawing mode and include/remove semantics
- **Decision:** a separate drawing mode (product owner's choice over auto-showing tools on canvas click); included drawings are linked to their canvas elements by an id in Excalidraw's `customData` and `data-drawing-id` on the image.
- **Tradeoff:** copies of tagged elements (copy/paste on the canvas) carry the same id and are treated as the same drawing.
- **Reason:** a calm canvas while writing, and a single button that both includes and removes without a separate table of drawing records.

### 17. Shape library kept in the browser
- **Context:** installing a library from libraries.excalidraw.com returned to the app but added nothing: the embed did not handle the `#addLibrary` return URL and had no library storage.
- **Decision:** use Excalidraw's `useHandleLibrary` with a `localStorage` persistence adapter; name each tab (`window.name`) so the library site returns to the same tab and the library installs live; open the canvas in drawing mode when a page load carries a library to install.
- **Alternatives:** store the library per user in the API (new table and endpoints); per document in the canvas scene (a library would have to be reinstalled in every document).
- **Tradeoff:** the library does not follow the user to another browser or device.
- **Reason:** the library is a personal toolbox, like the page lock, not document data; browser storage fixes the bug with no API or schema change. Moving it to the API later only means swapping the adapter.

### 18. Team workspaces: membership grants edit access
- **Context:** product-owner request: one employee works on several projects with different people; the list should be scoped by team.
- **Decision:** `teams` + `team_members` tables and a nullable `documents.team_id`. A document belongs to at most one team; **every member can edit** it, the creator stays its owner (delete, sharing). Any member can add colleagues by email. Documents enter a team when created there (new, template, import). Choices made by the product owner from three options presented.
- **Alternatives:** view-only membership with per-document sharing for edits (less useful day to day); admin role per team (more rules and screens); moving existing documents between teams (more UI and edge cases).
- **Tradeoffs:** no member removal or roles yet; a removed user would need a database change. Team access is resolved in the same single query as owner and shares, so it adds one `LEFT JOIN`, not an extra round trip. Non-members get 404, like private documents.
- **Reason:** the smallest model that makes teams useful, built on the existing access rule (one more input to `resolveAccess`) instead of copying shares to every member, which would go stale as members join.

### 19. Markdown export in the browser with Turndown
- **Context:** optional stretch goal ("Export to PDF or Markdown"); PDF already existed.
- **Decision:** convert the editor's current HTML to GitHub-flavored Markdown in the browser with Turndown (pinned to 7.2.4, a release older than two weeks) plus four rules: Mermaid blocks become ` ```mermaid ` fences (the importer's format, so exports round-trip), `<s>` becomes `~~`, underline stays as inline `<u>` (Markdown has none), and tight lists with one space after the marker. The file is named after the document title.
- **Alternatives:** a server endpoint (an extra route and round trip for data the browser already has, and it would miss unsaved edits); a hand-written ProseMirror serializer (more code to own for the same output); TipTap's Markdown extension (also changes how the editor parses content).
- **Tradeoffs:** included drawings and .docx pictures stay as `data:image` URIs: nothing is lost and editors such as VS Code render them, but GitHub does not. Fonts are dropped (no Markdown equivalent). The document title is the file name, not an added H1, because templates already start with their own heading.
- **Found while verifying:** the round trip (import a `.md`, export it) showed that importing already lost `~~strikethrough~~` and code-block languages. The sanitizer now maps `<del>`/`<strike>` to `<s>` and keeps only `language-*` classes on `<code>`.

### 20. Dark mode by token swap, light figures and light print
- **Context:** product-owner request.
- **Decision:** a second set of values for the existing color tokens under `:root[data-theme="dark"]`, limited to `@media screen`; system setting by default, header toggle remembered in `localStorage`, applied by an inline script before the first paint. Diagrams and included drawings keep a white background.
- **Alternatives:** Tailwind `dark:` variants on every component (hundreds of class changes, easy to miss one); rendering Mermaid with its dark theme (re-render on every toggle, and the PDF would then need a light re-render); a three-way light/dark/system control (more UI for little gain: clearing the choice is rarely needed).
- **Tradeoffs:** figures are bright rectangles on the dark page; the user cannot go back to "follow the system" without clearing site data.
- **Reason:** components already used tokens only, so the change is one CSS block, a small hook and a button, and it cannot leak into printed output.

### 21. Accepted dependency advisories
`npm audit` reports moderate advisories in `drizzle-kit`'s bundled esbuild (dev server issue). `drizzle-kit` is a dev-only CLI for generating migrations; it is not part of the running app. Accepted.
Excalidraw 0.18.1 pins older versions of `mermaid`/`langium`/`lodash-es` (used only by its optional "Mermaid to Excalidraw" dialog) and `nanoid`. They run in the browser on the user's own input, and the only offered fix is downgrading Excalidraw. Accepted until an upstream release; non-breaking fixes were applied with `npm audit fix`.
