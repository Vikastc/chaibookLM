# Deployment Guide

This guide covers two ways to host ChaiBookLM:

1. **[Docker](#docker-self-hosting)** — self-host on any VPS, Railway, Render, Fly.io, etc.
2. **[Vercel](#vercel-deployment)** — deploy the Next.js client and Express API as two separate Vercel projects.

---

## Docker (Self-Hosting)

### Prerequisites

- Docker Engine 24+ and Docker Compose V2
- A PostgreSQL 14+ database (or use the bundled container)
- API keys for all required services (see table below)

### Quick start

```bash
# 1. Clone and enter the repo
git clone https://github.com/YOUR_USERNAME/chaibookLM.git
cd chaibookLM

# 2. Create the server environment file from the example
cp server/.env.example server/.env
# → Open server/.env and fill in your real API keys (see table below)

# 3. Build and start all services
docker compose up --build

# App will be available at:
#   Client  → http://localhost:3001
#   API     → http://localhost:8080
#   Postgres→ localhost:5435
```

> **Note:** The first `docker compose up --build` compiles TypeScript and the
> Next.js bundle, so it may take 2–3 minutes. Subsequent starts (without
> `--build`) are near-instant.

### Environment variables for Docker

Edit `server/.env` before running. The `docker-compose.yml` at the root
automatically overrides `DATABASE_URL`, `CLIENT_URL`, and `BETTER_AUTH_URL` to
point at the internal Docker network, so you only need to fill in the API keys.

| Variable | Required | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ | Any long random string, e.g. `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | ✅ | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | From Google Cloud Console |
| `OPENAI_API_KEY` | ✅ | Chat models + embeddings |
| `PINECONE_API_KEY` | ✅ | Vector store |
| `PINECONE_INDEX` | ➖ | Default: `chaibook` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | PDF storage |
| `CLOUDINARY_API_KEY` | ✅ | PDF storage |
| `CLOUDINARY_API_SECRET` | ✅ | PDF storage |
| `FIRECRAWL_API_KEY` | ➖ | Website import |
| `TAVILY_API_KEY` | ➖ | Web search toggle in chat |
| `MEM0_API_KEY` | ➖ | Long-term user memory |
| `INNGEST_DEV=1` | ➖ | Keep as `1` for local dev; remove in production |

### Running Inngest locally (job queue)

The source-processing and artifact-generation jobs run through Inngest. In dev
mode you need the Inngest CLI:

```bash
# In a separate terminal
npx inngest-cli@latest dev -u http://localhost:8080/api/inngest
```

### Useful Docker commands

```bash
# Start in the background
docker compose up -d --build

# View logs
docker compose logs -f server
docker compose logs -f client

# Stop everything
docker compose down

# Stop and wipe the database volume
docker compose down -v

# Rebuild only one service
docker compose up -d --build server
```

### Google OAuth for Docker / VPS

When running behind a custom domain (e.g. `https://chaibooklm.example.com`):

1. In Google Cloud Console → APIs & Services → Credentials → your OAuth client:
   - Add **Authorised JavaScript origin**: `https://chaibooklm.example.com`
   - Add **Authorised redirect URI**: `https://chaibooklm.example.com/api/auth/callback/google`
2. Update your `server/.env`:
   ```
   CLIENT_URL=https://chaibooklm.example.com
   BETTER_AUTH_URL=https://chaibooklm.example.com/api
   ```
3. Rebuild: `docker compose up -d --build`

---

## Vercel Deployment

The repository is structured as two independent Vercel projects:

| Project | Root Directory | What it is |
|---|---|---|
| **Chaibook API** | `server/` | Express 5 app wrapped as a serverless function |
| **Chaibook Web** | `client/` | Next.js 16 (App Router) |

The Next.js site proxies all `/api/*` requests to the Express deployment through
`API_ORIGIN` in `next.config.ts`, so users see a single origin.

### Step 1 — Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/chaibookLM.git
git push -u origin main
```

### Step 2 — Create the Vercel projects

Go to [vercel.com/new](https://vercel.com/new) and import your repository
**twice**:

**Project 1 — Chaibook API**

- **Root Directory**: `server`
- **Framework Preset**: Other
- **Build Command**: `prisma generate`
- **Output Directory**: *(leave blank)*
- **Install Command**: `npm install`

**Project 2 — Chaibook Web**

- **Root Directory**: `client`
- **Framework Preset**: Next.js
- **Build Command**: `next build --webpack`

### Step 3 — Deploy the API first

Click **Deploy** on the API project and note the production URL, e.g.:
`https://chaibooklm-api.vercel.app`

### Step 4 — Set environment variables for the API project

In Vercel → **Chaibook API** → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled/serverless PostgreSQL URL (see note below) |
| `BETTER_AUTH_SECRET` | A long random string — **same value across all deployments** |
| `BETTER_AUTH_URL` | `https://YOUR_WEB_DOMAIN` (set after web is deployed; use the API URL as a placeholder) |
| `CLIENT_URL` | `https://YOUR_WEB_DOMAIN` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `OPENAI_API_KEY` | Your OpenAI key |
| `PINECONE_API_KEY` | Your Pinecone key |
| `PINECONE_INDEX` | `chaibook` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `INNGEST_EVENT_KEY` | From Inngest dashboard (see Step 6) |
| `INNGEST_SIGNING_KEY` | From Inngest dashboard (see Step 6) |
| `INNGEST_SERVE_ORIGIN` | `https://chaibooklm-api.vercel.app` |
| `FIRECRAWL_API_KEY` | *(optional)* |
| `TAVILY_API_KEY` | *(optional)* |
| `MEM0_API_KEY` | *(optional)* |

> **Database note:** Vercel serverless functions require a connection-pooling
> URL. Recommended options:
> - [Neon](https://neon.tech) — free tier, use the **pooled** connection string
> - [Supabase](https://supabase.com) — free tier, use the **Transaction pooler** string
> - [Vercel Postgres](https://vercel.com/storage/postgres) — natively integrated
>
> Do **not** use a direct (non-pooled) URL on Vercel — connections will time out.

### Step 5 — Run database migrations

Before the first release (and any time you add migrations):

```bash
cd server
DATABASE_URL='your-production-database-url' npx prisma migrate deploy
```

### Step 6 — Connect Inngest

1. Create a free account at [inngest.com](https://www.inngest.com).
2. In the Inngest dashboard go to **Manage → Apps → Add app**.
3. Add your API endpoint: `https://chaibooklm-api.vercel.app/api/inngest`
4. Copy the **Event Key** and **Signing Key** from the Inngest dashboard and
   paste them into the API Vercel project environment variables.
5. Redeploy the API project after adding these keys.

### Step 7 — Deploy the web project and set its variables

In Vercel → **Chaibook Web** → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `API_ORIGIN` | `https://chaibooklm-api.vercel.app` |

> **Do not** set `NEXT_PUBLIC_API_URL` in production. With `API_ORIGIN` set,
> the Next.js config proxies `/api/*` requests server-side, keeping your API
> URL invisible to the browser.

### Step 8 — Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services →
Credentials → your OAuth 2.0 Client:

- **Authorised JavaScript origins**: add `https://YOUR_WEB_DOMAIN`
- **Authorised redirect URIs**: add `https://YOUR_WEB_DOMAIN/api/auth/callback/google`

### Step 9 — (Optional) Add a custom domain

1. In Vercel → **Chaibook Web** → Settings → Domains, add your domain.
2. Update these API environment variables to the new domain:
   - `CLIENT_URL=https://YOUR_CUSTOM_DOMAIN`
   - `BETTER_AUTH_URL=https://YOUR_CUSTOM_DOMAIN`
3. Update the Google OAuth redirect URI to use the custom domain.
4. Redeploy both projects.

---

## Environment Variables — Quick Reference

### `server/.env` / Vercel API project

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Auth signing secret (keep consistent across redeploys) |
| `BETTER_AUTH_URL` | ✅ | Base URL where the auth server lives |
| `CLIENT_URL` | ✅ | Allowed CORS origin (your web app URL) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `OPENAI_API_KEY` | ✅ | Chat + embeddings |
| `PINECONE_API_KEY` | ✅ | Vector store |
| `PINECONE_INDEX` | ➖ | Default `chaibook` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | PDF storage |
| `CLOUDINARY_API_KEY` | ✅ | PDF storage |
| `CLOUDINARY_API_SECRET` | ✅ | PDF storage |
| `INNGEST_EVENT_KEY` | ✅ (prod) | Inngest event signing |
| `INNGEST_SIGNING_KEY` | ✅ (prod) | Inngest webhook signing |
| `INNGEST_SERVE_ORIGIN` | ✅ (prod) | Full URL of the API project |
| `INNGEST_DEV` | ➖ | Set `1` for local dev only |
| `FIRECRAWL_API_KEY` | ➖ | Website import |
| `TAVILY_API_KEY` | ➖ | Web search toggle |
| `MEM0_API_KEY` | ➖ | Long-term user memory |
| `PORT` | ➖ | Default `8080` |

### `client/.env.local` / Vercel Web project

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ➖ (dev only) | API base URL for local development |
| `API_ORIGIN` | ✅ (prod) | Server-side proxy target — never exposed to the browser |

---

## Post-Deploy Checklist

- [ ] Google sign-in and sign-out work
- [ ] After sign-in a page refresh keeps the session
- [ ] Upload a PDF ≤ 4 MB — it appears in the Sources panel as PROCESSING then READY
- [ ] In the Inngest dashboard the `source/process` job shows as completed
- [ ] Start a chat — responses stream with inline `[1]` citations
- [ ] Toggle web search — responses include `[W1]` citations
- [ ] Generate an artifact (summary / flashcards) from the Studio panel
- [ ] Enable Vercel Observability in both projects
- [ ] Keep preview deployments password-protected
- [ ] Confirm no API keys appear in `NEXT_PUBLIC_*` variables
