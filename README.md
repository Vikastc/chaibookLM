# 📚 RAG Studio & Ingestion Engine

[![Live Demo](https://img.shields.io/badge/Live_Demo-myai.vikastc.in-ff6b35?style=for-the-badge&logo=vercel)](https://myai.vikastc.in/)
[![Portfolio](https://img.shields.io/badge/Portfolio-vikastc.in-10b981?style=for-the-badge)](https://vikastc.in/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Inngest](https://img.shields.io/badge/Inngest-Workflows-purple?style=flat-square)](https://inngest.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_Search-blue?style=flat-square)](https://pinecone.io/)

An end-to-end multimodal RAG application: ingest multi-format sources (PDFs, YouTube, websites), chat with source-grounded streaming citations, and orchestrate durable background processing with Inngest. Live at **[myai.vikastc.in](https://myai.vikastc.in/)**.

## Features

- **Workspaces** — group sources and conversations per topic
- **Sources** — upload PDFs, import websites (Firecrawl), YouTube transcripts, or paste text/markdown
- **RAG chat** — streaming answers grounded in retrieved source chunks, cited as `[1]`, `[2]`…
- **Web search toggle** — opt-in current-info lookup via Tavily, cited as `[W1]`, `[W2]`
- **Memory** — per-user facts via Mem0 plus rolling conversation summaries
- **Studio / artifacts** — generate summaries, key takeaways, flashcards, quizzes, mind maps and reports from your sources
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

## Deploy on Vercel

This repository is ready to deploy as two small Vercel projects. Keeping the
Next.js site and Express API separate keeps the existing architecture intact;
the site proxies browser requests through its own `/api` path, so users still
have one origin for chat, sources, and authentication.

1. Push this repository to GitHub. In Vercel, import it twice:
   - **Chaibook web**: set the Root Directory to `client`.
   - **Chaibook API**: set the Root Directory to `server`.
2. Deploy the API first and note its production URL, for example
   `https://chaibook-api.vercel.app`.
3. Set the API project's production environment variables. Copy the names from
   `server/.env.example`, then set these production values in particular:
   - `CLIENT_URL=https://YOUR_APP_DOMAIN`
   - `BETTER_AUTH_URL=https://YOUR_APP_DOMAIN`
   - `DATABASE_URL` to a pooled, serverless-compatible PostgreSQL connection
     string (e.g. Neon / Supabase / Vercel Postgres pooled URL).
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` from the Inngest Vercel
     integration. Set `INNGEST_SERVE_ORIGIN` to the API project's URL.
4. In Google Cloud Console, add
   `https://YOUR_APP_DOMAIN/api/auth/callback/google` as an authorized redirect
   URI. Keep the same `BETTER_AUTH_SECRET` for all API deployments that share
   user sessions.
5. Set `API_ORIGIN=https://YOUR_API_DOMAIN` in the **web** Vercel project.
   Do not set `NEXT_PUBLIC_API_URL` in production: the app will use the
   same-origin `/api` proxy automatically.
6. Run database migrations against the production database before the first
   release and whenever a migration is added:

   ```bash
   cd server
   DATABASE_URL='your-production-database-url' npx prisma migrate deploy
   ```

7. Add your custom domain to the web project, make it the production domain,
   then update `CLIENT_URL`, `BETTER_AUTH_URL`, and the Google redirect URI to
   that exact HTTPS origin. Redeploy both projects after changing these values.

### Launch checklist

- Verify Google sign-in, sign-out, and a page refresh after sign-in.
- Upload a PDF smaller than **4 MB**; the limit is intentionally below Vercel's
  request-body ceiling. Use direct-to-storage uploads before raising it.
- Ask a streaming chat question, enable web search, and generate one artifact.
- Confirm Inngest shows the API endpoint at `/api/inngest` as connected and a
  source-processing job completes.
- Enable Vercel Observability and keep preview deployments protected. Keep API
  keys in Vercel environment variables only—never in `NEXT_PUBLIC_*` variables.

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
| `CLOUDINARY_CLOUD_NAME`                     | ✅       | PDF storage (Cloudinary dashboard → Product Environment Credentials) |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✅    | Used together with the cloud name for uploads + signed downloads |
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
- **Memory scoping**: facts the assistant *learns* while chatting are tagged with the workspace they came from and are only recalled inside that workspace. Notes you add manually on the Memory page stay available everywhere.
- **Keyboard shortcuts**: `d` toggles light/dark theme (ignored while typing), `⌘/Ctrl+B` toggles the sidebar.

