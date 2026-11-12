# Ajaia Docs

A lightweight collaborative document editor for product and engineering teams, inspired by Google Docs. Write specs, RFCs and status updates with rich text, import existing files, and share them with teammates as viewers or editors.

> Built for the Ajaia AI-Native Full Stack assessment ([brief](docs/assignment-brief.md)).

**Live app:** _deployment in progress — URL will be added here_
**Demo accounts** (password `demo1234` for all, or use the one-click buttons on the login page):

| Account | Starts with |
|---|---|
| `alice@ajaia.dev` | Owns "Welcome to Ajaia Docs", shared with Bob as editor |
| `bob@ajaia.dev` | Sees the welcome document under **Shared with me** |
| `carol@ajaia.dev` | No documents (good for testing sharing from scratch) |

To try sharing, sign in as two people in different browsers (or one normal + one private window).

## Features

- **Documents:** create, rename (inline title), edit, delete; reopen with formatting intact.
- **Rich text:** headings (H1–H3), bold, italic, underline, strikethrough, bulleted and numbered lists, quotes, code blocks, undo/redo, keyboard shortcuts.
- **Autosave** with a visible status, `Ctrl/Cmd+S`, and protection against overwriting someone else's newer save.
- **File import:** upload **`.txt`, `.md` or `.docx` (max 5 MB)** to create a new editable document. Headings, emphasis and lists are preserved; images and tables in `.docx` are not supported.
- **Sharing:** the owner shares by email as **Can edit** or **View only**, changes roles, or removes access. Lists are split into **My documents** and **Shared with me**; viewers get a read-only editor.

## Run locally

Requirements: **Node.js 20+** (22 recommended). No database setup: an embedded Postgres (PGlite) is used when `DATABASE_URL` is empty.

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3000

Demo users are seeded on first start. Local data is stored in `apps/api/.data/pglite` (delete the folder to reset).

Production-like run (API serves the built app on one port):

```bash
npm run build
npm start          # http://localhost:3000
```

Configuration: see [`apps/api/.env.example`](apps/api/.env.example) (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `SEED_DEMO_DATA`).

## Run tests

```bash
npm test
```

Runs 46 tests: API unit and integration tests (on an in-memory Postgres) and web unit tests. Details: [docs/testing.md](docs/testing.md).

## API Documentation (Swagger)

The backend API is documented with **Swagger / OpenAPI**. With the app running, open:

- **Local:** http://localhost:3000/api/docs
- **Live:** `<live app URL>/api/docs`

Raw OpenAPI JSON: `/api/docs/json`. To call protected endpoints from Swagger UI, first execute `POST /api/auth/login` (e.g. `alice@ajaia.dev` / `demo1234`); the browser keeps the session cookie.

## Deployment

Single Render web service (API + static web app) defined in [`render.yaml`](render.yaml), with a free Neon Postgres database:

1. Create a free Postgres database on [Neon](https://neon.tech) and copy its connection string.
2. On [Render](https://render.com): **New → Blueprint**, select this repository, paste the connection string into `DATABASE_URL`.
3. Render builds (`npm ci --include=dev && npm run build`), runs migrations and the seed on startup, and checks `/api/health`.

The free tier sleeps after ~15 minutes idle; the first request afterwards can take ~50 s.

## What is not included

Deliberately out of scope for the 4–6 hour timebox:

- **Real-time co-editing and presence** (Yjs/CRDT + WebSockets). Concurrent saves are detected (HTTP 409) and the user is asked to reload instead of merging.
- Comments, suggestions, version history, export.
- Sign-up, password reset, organizations/teams.
- Attachments and images inside documents.

**Next, with 2–4 more hours:** real-time collaboration on the existing editor (Yjs + Hocuspocus, which TipTap supports), version history using the existing `version` column (snapshot per save), and export to Markdown/PDF.

## Documentation

| Doc | Contents |
|---|---|
| [Architecture](docs/architecture.md) | What was prioritized and why, system overview, request lifecycle |
| [Decision log](docs/decisions.md) | Each decision with alternatives, tradeoffs and reasoning |
| [Backend](docs/backend.md) | API structure, routes, error contract, security notes |
| [Frontend](docs/frontend.md) | Structure, state, autosave, accessibility, design |
| [Database](docs/database/database.md) | Schema, ER diagram, relationships, indexes, migrations |
| [Testing](docs/testing.md) | Strategy, what each suite proves, running against real Postgres |
| [AI workflow](docs/ai-process.md) | Tools, prompts, what AI sped up, what was changed, verification |
| [Assignment brief](docs/assignment-brief.md) | Original requirements |

## Project structure

```
apps/
  api/     Fastify + TypeScript API, Drizzle schema and migrations, tests
  web/     React + Vite + TipTap single-page app
docs/      Architecture, decisions, module docs, ER diagram
render.yaml
```
