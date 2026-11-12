# Submission — Ajaia AI-Native Full Stack Developer Assignment

## Links

| What | Where |
|---|---|
| Live product | https://ajaia-docs-hz3d.onrender.com (free tier: first load after idling can take ~50 s) |
| API documentation (Swagger UI) | https://ajaia-docs-hz3d.onrender.com/api/docs |
| Source code | https://github.com/Warphn/ajaia-docs-editor |
| Walkthrough video | See [`walkthrough-video-url.txt`](walkthrough-video-url.txt) |

## Test accounts

All passwords: `demo1234` (the login page also has one-click buttons).

| Account | Use it to |
|---|---|
| `alice@ajaia.dev` | Owner of "Welcome to Ajaia Docs", already shared with Bob as editor |
| `bob@ajaia.dev` | See a document under **Shared with me** and edit it |
| `carol@ajaia.dev` | Start from zero: share a document with Alice or Bob as **View only** and open it as them |

## What is included

| Deliverable | File |
|---|---|
| Source code | [`apps/api`](apps/api) (Fastify + PostgreSQL API), [`apps/web`](apps/web) (React + TipTap app) |
| README with local setup and run instructions | [`README.md`](README.md) |
| Architecture note (what was prioritized and why) | [`docs/architecture.md`](docs/architecture.md), with the decision log in [`docs/decisions.md`](docs/decisions.md) |
| AI workflow note | [`docs/ai-process.md`](docs/ai-process.md) |
| Walkthrough video URL | [`walkthrough-video-url.txt`](walkthrough-video-url.txt) |
| Screenshots | [`docs/screenshots/`](docs/screenshots) (also embedded in the README) |
| Module documentation | [`docs/backend.md`](docs/backend.md), [`docs/frontend.md`](docs/frontend.md), [`docs/database/database.md`](docs/database/database.md) (+ ER diagram), [`docs/testing.md`](docs/testing.md) |
| Deployment definition | [`render.yaml`](render.yaml) (Render Blueprint: web service + Postgres) |
| Automated tests | 91 tests, run with `npm test` ([strategy](docs/testing.md)) |
| Original brief | [`docs/assignment-brief.md`](docs/assignment-brief.md) |

## Status

**Working end to end** (locally and on the live URL):
- Create, rename, edit, delete and reopen documents with rich text (headings, bold, italic, underline, strikethrough, lists, quotes, code blocks), autosave and conflict protection.
- File import: `.txt`, `.md`, `.docx` (max 5 MB) become new editable documents.
- Sharing by email with **Can edit** / **View only** roles; owned vs shared lists; read-only editor for viewers; revoke access.
- Persistence in PostgreSQL; formatting preserved across reloads.
- Templates for tech-team documents (feature spec, RFC, client presentation, management update, postmortem).
- Mermaid diagrams in documents, with live-preview editing.
- Canvas around the page (≥ 768 px): drawing mode with Excalidraw tools, drag a drawing onto the page or click to include, same button removes it, move/lock/reset the page, drawings saved with the document.
- A4 pages with page-break guides while editing; Export PDF prints exactly that layout (page only, no browser header/footer).
- Fonts: IBM Plex Sans (default), Arial, Times New Roman, Georgia, Roboto, Courier New.

**Incomplete / intentionally out of scope:** real-time co-editing and presence (concurrent text saves are detected and the user reloads; the canvas is last-write-wins), comments, version history, Markdown export, sign-up and password reset, file attachments. Included drawings are static images (edit on the canvas and include again).

**Next 2–4 hours:** real-time collaboration with Yjs + Hocuspocus on the existing TipTap editor; version history built on the existing `version` column (one snapshot per save, restore); export to Markdown; editable included drawings (keep the Excalidraw scene inside the image node).
