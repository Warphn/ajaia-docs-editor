# CLAUDE.md

Guidance for Claude when working in this repository.

## Context

This repository is a submission for the **Ajaia AI-Native Assessment**. It is time-bound and evaluates:

1. **AI Leverage** – how AI accelerates and improves the output (prompting, decomposition, iteration).
2. **Execution Quality** – clear, accurate, useful output delivered within constraints and ambiguity.
3. **Decision-Making** – explicit tradeoffs, prioritization, real-world practicality.
4. **Communication** – structured, readable, stakeholder-ready.

Optimize for **real-world execution, not perfection**: ship a working, well-scoped solution first, then improve.
If the assignment brief is available in the repo, read it before planning. Where the brief is ambiguous, pick a reasonable assumption, record it in the docs, and move on.

## Language

- The user communicates in **Portuguese**. Reply to the user in Portuguese.
- **Everything in the repository is in English**: code, identifiers, comments, commit messages, tests, documentation, diagrams, Swagger descriptions.

## Code Standards

- **Readability comes first.** Code must be easy for a human to read.
- Use descriptive names. Never use single-letter or cryptic names (`p`, `t`, `x`, `tmp`, `data2`). Loop indices included: prefer `userIndex` over `i` when it aids clarity.
- Keep functions small and single-purpose. Prefer clarity over cleverness.
- Comments explain *why*, not *what*. Do not comment obvious code.
- Handle errors explicitly; return meaningful error messages and HTTP status codes.

## Testing

- Write **unit tests** for all business logic (services, utilities, validators).
- Tests must be runnable with a single documented command.
- Test names describe the behavior being verified (e.g. `returns 404 when user does not exist`).
- Run the test suite before declaring any task complete.

## Backend API

- Every route must be documented with **Swagger / OpenAPI**: summary, request parameters/body, response schemas, and error responses.
- The Swagger UI must be reachable at a documented URL (e.g. `/docs`).
- **The `README.md` must explicitly state that the backend API is documented with Swagger** and give the exact URL to open it once the app is running.

## Database

- If a database is created, generate an **Entity-Relationship diagram in draw.io** saved as `docs/database/er-diagram.drawio.svg` (editable in draw.io and rendered natively by GitHub) and embed it in the database documentation.
- Keep the diagram in sync with the schema whenever the schema changes.

## Documentation

Documentation must be **concise, precise, and objective**. No filler.

Organize docs by module so design decisions are easy to look up:

```
README.md                  # Overview, setup, how to run, how to test
docs/
  architecture.md          # High-level design, stack choices, module overview
  decisions.md             # Decision log: decision, alternatives, tradeoff, reason
  database/
    database.md            # Schema, entities, relationships, indexes
    er-diagram.drawio.svg  # ER diagram
  backend.md               # API structure, routes summary, link to Swagger
  frontend.md              # (if applicable) structure, state, key components
  testing.md               # Test strategy and how to run
  ai-process.md            # How AI was used (see below)
```

Add or remove modules as the project requires. Each doc should state decisions **and the reasoning/tradeoffs** behind them.

## Showing the Process (required by the assessment)

The evaluators want to see *how* the work was done, not only the result. Maintain `docs/ai-process.md` with:

- How the problem was decomposed into tasks.
- Key prompts/instructions used and which model/tool handled each step (e.g. Opus for planning, another model for implementation).
- Iterations: what was tried, what was corrected, and why.
- Assumptions made due to ambiguity.
- What was deliberately left out of scope given the time limit, and what would come next.

Update it as work progresses, not only at the end.

## Submission Format

- **The GitHub repository is the submission.** All deliverables are structured Markdown rendered by GitHub.
- `README.md` is the entry point: a short overview, how to run and test, a dedicated **API Documentation (Swagger)** section with the Swagger UI URL, and a section index linking (relative links) to every doc in `docs/`.
- Everything must render correctly on GitHub: relative links, embedded images/SVGs, Mermaid for simple inline diagrams if useful.
- Include reasoning where relevant; avoid unnecessary verbosity.
- The `README.md` must let a reviewer understand, run, and test the project in a few minutes.

## Git

- Git history is part of the evidence of process. Commit in **small, meaningful steps** with clear messages (Conventional Commits, e.g. `feat: add user registration endpoint`).
- Never commit secrets; provide a `.env.example` instead.
