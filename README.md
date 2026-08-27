# Chaibook

A NotebookLM-style AI workspace: add sources, then chat with an assistant that answers **only** from your material — with inline citations.

## Features

- **Workspaces** — group sources and conversations per topic
- **Sources** — upload PDFs, import websites (Firecrawl), YouTube transcripts, or paste text/markdown
- **RAG chat** — streaming answers grounded in retrieved source chunks, cited as `[1]`, `[2]`…
- **Web search toggle** — opt-in current-info lookup via Tavily, cited as `[W1]`, `[W2]`
- **Memory** — per-user facts via Mem0 plus rolling conversation summaries
- **Artifacts panel** — generated learning material from workspace sources (WIP)
- **Auth** — Google sign-in (better-auth), per-user data isolation

## Tech stack

| Layer     | Tech                                                                        |
| --------- | --------------------------------------------------------------------------- |
| Client    | Next.js (App Router), React 19, TanStack Query, Tailwind CSS, AI SDK v7     |
| Server    | Express 5, TypeScript, Prisma 7 (PostgreSQL), better-auth                   |
| AI        | OpenAI (`gpt-4o-mini` / `gpt-4o`, `text-embedding-3-small`), Pinecone, Mem0 |
| Jobs      | Inngest (source processing, summaries, artifact generation, stale reaper)   |
| Ingestion | unpdf (PDF text), Cloudinary (PDF storage), Firecrawl, youtube-transcript   |

## Architecture

```
Upload PDF ──▶ Cloudinary ─┐
Import URL ──▶ Firecrawl ──┤
YouTube ────▶ transcript ──┴─▶ Source row (PENDING)
                                   │  Inngest: source/created
                                   ▼
                    extract ─▶ chunk (~1000 chars) ─▶ embed ─▶ Pinecone
                                                     (namespace = workspaceId)

Chat turn:
question ─▶ embed + query Pinecone (top-k=6, min score 0.15)
         ─▶ system prompt [chunks + memories + summary]
         ─▶ streamText ─▶ UI stream  (+ X-Conversation-Id header)
```

Tuning knobs live in `server/src/lib/aiConfig.ts`.

## Getting started

### Prerequisites

- Node.js 22+
- A PostgreSQL database
- API keys: OpenAI, Pinecone, Cloudinary (upload-enabled key); optional — Tavily (web search), Firecrawl (websites), Mem0 (memory)
- Inngest Dev Server (runs locally via the CLI below; no account needed in dev)

### Setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment (see tables below) — create server/.env and client/.env.local

# 3. Apply database migrations + generate the Prisma client
cd ../server && npx prisma migrate dev
```

### Run (three terminals)

```bash
# Terminal 1 — API server on :8080
cd server && npm run dev

# Terminal 2 — Next.js app on :3001
cd client && npm run dev

# Terminal 3 — Inngest Dev Server (job runner)
npx inngest-cli@latest dev -u http://localhost:8080/api/inngest
```

Then open **http://localhost:3001** and sign in with Google.

## Environment variables

### `server/.env`

| Variable                                    | Required | Purpose                                           |
| ------------------------------------------- | -------- | ------------------------------------------------- |
| `DATABASE_URL`                              | ✅       | PostgreSQL connection string                      |
| `BETTER_AUTH_SECRET`                        | ✅       | Auth signing secret                               |
| `BETTER_AUTH_URL`                           | ✅       | e.g. `http://localhost:8080`                      |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅       | Google OAuth credentials                          |
| `CLIENT_URL`                                | ✅       | Allowed CORS origin, e.g. `http://localhost:3001` |
| `OPENAI_API_KEY`                            | ✅       | Chat models + embeddings                          |
| `PINECONE_API_KEY`                          | ✅       | Vector store (index auto-created)                 |
| `PINECONE_INDEX`                            | ➖       | Index name (default `chaibook`)                   |
| `CLOUDINARY_URL`                            | ✅       | PDF storage (`cloudinary://key:secret@cloud`)     |
| `CLOUDINARY_API_KEY` / `_SECRET`            | ➖       | Signing downloads if PDFs are access-restricted   |
| `INNGEST_DEV`                               | ➖       | `1` enables dev-mode event signing                |
| `FIRECRAWL_API_KEY`                         | ➖       | Website import                                    |
| `TAVILY_API_KEY`                            | ➖       | Web search toggle in chat                         |
| `MEM0_API_KEY`                              | ➖       | Long-term user memory                             |
| `PORT`                                      | ➖       | Default `8080`                                    |

### `client/.env.local`

| Variable                       | Required | Purpose                                    |
| ------------------------------ | -------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL`          | ➖       | API base (default `http://localhost:8080`) |
| `NEXT_PUBLIC_BETTER_AUTH_URL`  | ➖       | Auth base used by the browser client       |

## Project structure

```
client/
  app/                    # App Router pages (workspace, auth screens)
  features/
    conversations/        # Chat panel, composer, message rendering
    sources/              # Sources panel, upload/import dialogs
    workspaces/           # Workspace management
  components/ui/          # UI primitives
server/
  prisma/                 # Schema + migrations
  src/
    controllers/          # Request handlers (incl. retrySource)
    services/             # Business logic + Prisma queries
    lib/                  # Integrations (openAI, pinecone, pdf, cloudinary…)
      rag/retrieve.ts     # Retrieval + system-prompt builder
    inngest/              # Job definitions (process-source, reaper, …)
    routes/ middleware/ validators/
```

## Notes & gotchas

- **Stuck sources self-heal**: anything queued/processing longer than 10 minutes is marked FAILED by the reaper job; failed sources show a ↻ retry button in the Sources panel.
- **The Pinecone index** (`PINECONE_INDEX`, 1536-dim, cosine, AWS us-east-1 serverless) is created automatically on first use.
- **Keyboard shortcuts**: `d` toggles light/dark theme (ignored while typing), `⌘/Ctrl+B` toggles the sidebar.

