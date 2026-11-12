# AI-native workflow

How the work was split between a human and AI, what the AI produced, what was corrected, and how it was verified. Updated as the work progressed.

## Tools

| Tool | Used for |
|---|---|
| **Claude Code** (Claude Opus 5.5) in VS Code | Reading the brief, planning, scaffolding, implementation, tests, docs, git commits |
| Claude Code *plan mode* | Producing the implementation plan before any code; the human approved it explicitly |
| Headless Chrome via Playwright (driven by Claude Code) | Clicking through the built app, taking screenshots, checking mobile layout |
| Docker (Postgres 17) | Running the integration suite on a real Postgres server |
| [`CLAUDE.md`](../CLAUDE.md) | Persistent instructions to the agent: readable names, tests for business logic, Swagger on every route, docs layout, small conventional commits |

## Division of work

**Human decisions** (product and judgment):
- Product direction: "the best Google Docs for teams at tech companies", with templates for recurring deliverables and quick diagrams.
- Stack constraint: TypeScript + React, with a real database.
- Approved the plan; picked **Mermaid over Excalidraw** and **viewer/editor roles in the core** when the AI laid out the tradeoffs.
- Workflow: GitHub as the working source of truth; the Google Drive package is assembled at the end.

**AI work** (execution, with its reasoning recorded here and in [decisions](./decisions.md)): stack details, architecture, code, tests, verification, documentation.

## Decomposition

The plan ([architecture](./architecture.md)) split the work into commit-sized steps, each verified before moving on:

1. Scaffold the monorepo, Fastify + Swagger, Drizzle schema, PGlite fallback, seed → health test
2. Auth, documents CRUD, access control, sanitizer, sharing → unit + integration tests
3. File import (.txt/.md/.docx) → unit + endpoint tests
4. React app: login, list, editor, autosave, share dialog → hook tests + browser walkthrough
5. Deploy blueprint, Postgres parity check
6. Docs (written alongside, finalized at the end)
7. Templates, then Mermaid diagrams (differentiators, after the core is deployed)

## Key prompts (summarized, translated from Portuguese)

1. *"This is the assignment [4 screenshots]. Read everything, confirm, then create a repository with an initial commit."* → The AI transcribed the brief into [`docs/assignment-brief.md`](./assignment-brief.md) so every later decision could cite it.
2. *"Implement the core first; all basic features must exist. TypeScript and React for back and front; we need a database. Focus on what teams at tech companies value: file presets (feature presentation for a client, update for management, feature planning) and quick diagrams like Excalidraw."* → Plan mode: the AI proposed the stack, data model, API, step order, and two explicit questions (diagram engine, sharing roles), and listed what it would cut first if time ran short (diagrams).

## Where AI materially sped things up

- **Boilerplate with intent:** Zod schemas that serve as validation, types and OpenAPI at once; consistent error contract across 13 routes.
- **Test scaffolding:** an end-to-end sharing scenario (17 ordered steps through HTTP + SQL) and a `.docx` fixture built in memory with JSZip instead of committing binary files.
- **Verification loop:** the agent built the app, drove a real browser through the main flow and read its own screenshots, which caught a layout bug a human would only spot on a phone.
- **Docs and diagrams:** the ER diagram is generated as an SVG with the draw.io model embedded, so it renders on GitHub and stays editable.

## What was changed or rejected

| AI output / idea | What happened | Why |
|---|---|---|
| Writing code from memory for brand-new library majors (TypeScript 7, Zod 4, fastify-type-provider-zod 7, TipTap 3) | Corrected course: read the installed packages' READMEs and `.d.ts` files before writing integration code | Avoids confidently wrong APIs; e.g. the type provider v7 serializes with `z.output`, and TipTap 3 bundles Underline/Link in StarterKit |
| Excalidraw embed for diagrams | Rejected (human choice, AI recommendation) in favor of Mermaid | ~1–2 MB bundle and higher risk vs diagrams-as-code engineers already use |
| TipTap JSON as the storage format | Rejected for sanitized HTML | One format for editor, importers, templates and export ([decision 5](./decisions.md#5-store-content-as-sanitized-html)) |
| Real-time collaboration | Deferred | Too large for the timebox; optimistic versioning prevents data loss instead |
| First version of "reload after conflict" | Simplified by the AI on self-review (a nested `fetchQuery` wrapping `refetch`) | Needless indirection |
| Sanitizer draft with an `exclusiveFilter` and a misleading comment | Removed | Did nothing; comment described behavior the code didn't have |
| Unit test expecting `titleFromFileName('.md')` to fall back | Test failed: Node treats `.md` as a dotfile with no extension. Replaced with a realistic case | Such a file is already rejected (415) earlier; the test was asserting an impossible path |
| Header layout | Browser screenshot at 390 px showed the title input squeezed to 0 px. Fixed with a compact header (logo-only, icon sign-out) | Found by verification, not by reading code |
| Neon as the production database (AI plan) | Replaced by a Render Postgres declared in `render.yaml` when the human hit a Vercel-only sign-up flow at deploy time | Fewer accounts and zero manual wiring outweigh the 30-day expiry of the free database |
| Rendering diagrams in a dialog opened from inside the editor | Dialog moved to a React portal on `<body>` before it shipped | Inputs inside ProseMirror's DOM can be captured by the editor; a portal keeps the textarea independent |
| Canvas spike before coding | Read Excalidraw 0.18's `.d.ts` and built CSS first: confirmed `onScrollChange`/`updateScene`/`exportToSvg`, that its root creates no stacking context (so the page can sit at z-index 3 between canvas and toolbars), and that keyboard/paste handlers ignore focus outside its container | Avoided building on guessed APIs and an input-capture bug |
| Excalidraw install | The app went blank: npm installed React 18 for an Excalidraw sub-dependency next to the app's React 19. Diagnosed from the error ("reading 'useEffect' of null") and `npm explain`; an npm `overrides` attempt failed, the fix was pinning React 19 at the workspace root (single copy) plus Vite `dedupe`, verified with a clean `npm ci` | Found by the browser check, not by type-checking or unit tests |
| Page-only PDF without browser header/footer | Spiked before building: rendered a 70-paragraph A4 page through headless Chrome's print pipeline to confirm `@page { margin: 0 }` + `box-decoration-break: clone` keeps margins on every page | The rest of the page-guide design depended on it |
| Text cursor near the bottom of the page | Browser test showed the whole workspace (Excalidraw toolbar, page, controls) shifted up: `overflow: hidden` containers are still programmatically scrollable. Fixed with `overflow: clip` and canvas panning that follows the caret | Visible only in a real browser with a page taller than the viewport |
| Dropping a drawing on a paragraph | First version used the exact drop position and split "Second paragraph" in two in the exported PDF. Changed to insert between top-level blocks | Found by reading the generated PDF, not the DOM assertions |
| Verification script false alarms | Two failures came from the test script itself (keys sent to the `<select>` before focus returned to the editor; reading the canvas before the 1 s debounce fired; a regex not expecting `&quot;`). Each was isolated with a minimal reproduction before concluding it was not a product bug | Avoids "fixing" correct code |
| Bug report: "adding a library from the Excalidraw library site does nothing" | Root cause found by reading Excalidraw 0.18's source before changing code: the return URL carries `#addLibrary=<url>`, which only the `useHandleLibrary` hook processes, and the embed never called it (and had no library storage). Fixed with the hook + a tested `localStorage` adapter; the canvas also opens in drawing mode on return, because view mode hides the library sidebar. Verified in headless Chrome by replaying the return URL with a real catalog library: confirm prompt, 2 items installed, still there after reload | The second problem (hidden sidebar) would have made a correct fix look broken |
| Product-owner feedback on the library fix: the page controls covered "Browse libraries", and every added library opened another tab of the document | Reading Excalidraw's `LibraryMenuBrowseButton` showed the site receives `target=${window.name \|\| "_blank"}`: an unnamed tab always gets a new one. A unique `window.name` per tab makes the site navigate the original tab's hash, so the library installs live (and the matching token skips the prompt). Controls now shift by the measured sidebar width. Verified in headless Chrome clicking the real "Add to Excalidraw" button: still 2 tabs, original tab not reloaded, 0 prompts, 7 items in the sidebar | The tab behavior looked like an inherent limit of the library site; the source showed it was a one-line configuration on our side |
| Team workspaces with ~70 minutes left | Scoped before coding: the AI read the access rule, schema and list page, proposed an MVP and asked the three product questions that change the schema and permissions (edit vs view, who adds members, moving existing documents). Built API first with TDD (access rule unit tests, 12 HTTP + SQL integration tests), then UI, then verified in headless Chrome as three users (Alice creates a team and adds Bob, Bob edits the team document, Carol never sees the team). One reported failure was the script reading the list before it refreshed, confirmed by the screenshot | Asking the product questions up front avoided rework on the riskiest part (permissions) under time pressure |
| Initial bundle of 732 kB (230 kB gzip) | Editor route lazy-loaded → 316 kB (100 kB gzip) initial | Login and list don't need ProseMirror |

## How correctness, UX and reliability were verified

- **Automated:** 108 tests (`npm test`): access rules, sanitizer, importers, full sharing flow over HTTP + SQL, import endpoint limits, autosave behavior. See [testing](./testing.md).
- **Database parity:** the same integration suite passed on PGlite and on Postgres 17 (Docker), covering both production and local drivers.
- **Types and build:** strict TypeScript (`noUncheckedIndexedAccess`) and production builds of both apps on every step.
- **Real browser:** a scripted Chrome walkthrough as two users (owner shares → recipient sees it under "Shared with me", read-only), reload to confirm formatting persists, mobile viewport check, and no unexpected console errors.
- **Production:** after each deploy, scripted browser checks ran against the live URL (two users, share as viewer, reload, read-only; create from template, insert and save a diagram), deleting their own test documents afterwards.
- **Swagger:** checked that every route appears at `/api/docs` with request and error schemas.

## Assumptions made due to ambiguity

- "Sharing" means access between named accounts in the same organization, not public links.
- "File upload" is satisfied by importing a file into a new editable document.
- Seeded accounts are acceptable as the user model (explicitly allowed by the brief).
- Simultaneous editing must not lose data, but does not need to merge live.

## Timeline

| Time (local) | Milestone |
|---|---|
| 16:15 | Brief read, repo created and pushed |
| 16:30 | Plan approved (stack, scope, order, two product questions answered) |
| 16:48 | API scaffold + DB + Swagger, first tests green |
| 16:51 | Auth, documents and sharing API, 29 tests |
| 16:53 | File import, 42 tests |
| 17:01 | Web app working end to end in a real browser |
| 17:04 | Deploy blueprint, Postgres parity verified |
| 17:15 | Documentation |
| 17:30 | Deployed to Render, verified live |
| 17:40 | Templates (5 tech-team documents) |
| 17:55 | Mermaid diagrams (editor node, live-preview dialog, Markdown import) |
| 18:05 | Templates and diagrams verified live; SUBMISSION.md, screenshots |
| — | Second iteration requested by the product owner: canvas around the page (plan → user chose draggable page + saved canvas) |
| +1h45 | Canvas API, Excalidraw workspace, include-in-document, lock/reset, print-only-page, docs |
| — | Third iteration from product-owner feedback: drawing mode, drag drawing to page, include/remove toggle, A4 WYSIWYG export with page guides, fonts (asked: page size → A4; drawing mode → explicit button) |
| — | Fourth iteration: Excalidraw library fixes, then team workspaces in the remaining ~70 min (asked: member access → edit; who adds members → any member; scope → documents created in the team) |

## Out of scope, and what's next with 2–4 more hours

See the README section [What is not included](../README.md#what-is-not-included).
