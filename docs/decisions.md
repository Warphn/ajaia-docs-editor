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

### 14. Accepted dependency advisories
`npm audit` reports moderate advisories in `drizzle-kit`'s bundled esbuild (dev server issue). `drizzle-kit` is a dev-only CLI for generating migrations; it is not part of the running app. Accepted.
