# Assignment Brief — AI-Native Full Stack Developer

Transcription of the original assignment, kept in the repo as the source of truth for scope decisions.

## Objective

Test how a realistic product-engineering problem is handled with ambiguous scope, multiple surfaces, and tight delivery constraints: prioritization, what gets built, how tradeoffs are communicated, and how AI tools are used without outsourcing judgment.

## Time Limit

4–6 hours. If the limit is reached, stop and submit. A focused, well-reasoned partial solution is better than an overextended build.

## Scenario

Ajaia is exploring internal productivity tools that help teams move faster on shared work. Build a **lightweight collaborative document editor inspired by Google Docs**.

The goal is not to recreate Google Docs, but to ship the strongest working version within the timebox while showing sound product judgment, full stack capability, and clear prioritization. The app should demonstrate thinking about document creation, editing, file handling, sharing, and usability in a real product environment.

## Tasks

### 1. Document Creation and Editing

Users should be able to:

- Create a new document
- Rename a document
- Edit document content in a browser
- Save and reopen documents

Basic rich-text formatting:

- Bold
- Italic
- Underline
- Headings or text size variation
- Bulleted or numbered lists

Does not need to match Google Docs, but the editing flow should feel usable and coherent.

### 2. File Upload

Allow a user to upload at least one file into the product workflow. Behavior is up to us, but it must be product-relevant. Examples:

- Uploading a `.txt`, `.md`, or `.docx` file and turning it into a new editable document
- Uploading an attachment associated with a document
- Importing content from a file into an existing draft

If supported file types are limited, state that clearly in the UI and README.

### 3. Sharing

A simple sharing model so one user can share a document with another. Not enterprise-grade, but with clear intent and working logic. At minimum:

- A document owner
- A way to grant another user access
- A visible distinction between owned and shared documents

Users may be simulated with seeded accounts, mocked auth, or a lightweight login flow.

### 4. Persistence

Persist documents and sharing data so that:

- Documents remain available after refresh
- Formatting or structure is preserved in a reasonable way
- Shared access behavior can be demonstrated

Any practical storage approach is acceptable (SQLite, Postgres, Supabase, local file-based store) if well documented.

### 5. Product and Engineering Quality

At minimum:

- Clear setup and run instructions
- A working deployment reviewers can access
- Basic validation and error handling
- At least one meaningful automated test
- A short architecture note explaining what was prioritized and why

## AI-Native Workflow Note

A short note explaining:

- Which AI tools were used
- Where AI materially sped up the work
- What AI-generated output was changed or rejected
- How correctness, UX quality, and implementation reliability were verified

Evaluated on practical AI usage, not volume.

## Walkthrough Video

3–5 minutes (unlisted Loom or YouTube) covering:

- The main user flow
- What functionality works end to end
- What was intentionally deprioritized
- Key implementation decisions
- How AI supported the workflow

## Deliverables

One Google Drive folder containing:

- The source code
- A `README.md` with local setup and run instructions
- A short architecture note (Markdown or PDF)
- The AI workflow note (Markdown or PDF)
- A `SUBMISSION.md` listing exactly what is included
- A live product URL, deployed via a preferred path
- A text file with the walkthrough video URL
- Screenshots or a short demo GIF if setup requires extra steps

## Submission Format

- One Google Drive folder link containing all materials
- A live deployment link
- Any credentials, seeded users, or test accounts needed to review sharing flows
- Clear instructions to run the project locally

If any feature is partial or incomplete, state:

- What is working
- What is incomplete
- What would be built next with another 2–4 hours

## Constraints

- Keep the project intentionally scoped
- Do not try to build every Google Docs feature
- Prioritize depth in a few important areas over shallow coverage everywhere
- Any language, framework, editor library, or tooling stack is allowed
- AI coding tools and assistants are allowed
- Reviewers must not be required to pay for a dependency or service

Product judgment is evaluated as much as implementation skill. Strong candidates make deliberate scope cuts and explain them clearly.

## What Will Be Evaluated

- Turning an open-ended prompt into a coherent product slice
- Full stack execution across frontend, backend, persistence, and access logic
- Quality of the document editing experience within the chosen scope
- Practical handling of file upload and sharing behavior
- Basic infrastructure and deployment judgment, including shipping a testable build
- Code clarity, maintainability, and delivery discipline
- Prioritization and tradeoff awareness under time pressure
- Written and verbal communication quality
- Mature use of AI tools without sacrificing engineering standards

## Optional Stretch

If finished early, one small enhancement such as:

- Real-time collaboration indicators
- Commenting or suggestion mode
- Document version history
- Export to PDF or Markdown
- Role-based sharing permissions beyond basic access

Optional — do not sacrifice core functionality for stretch work.
