# Kuromi's Secret Base

Kuromi's Secret Base is a Kuromi-themed personal site built with `React + TypeScript + Vite + Express + Redis`.
It supports two fixed administrators, `RobinElysia` and `Meow`, plus a nickname-based guest mode.

The project is a single repository:

- The frontend is built with Vite and React.
- The backend is `server.ts`, which serves API routes and, in production, also serves the built frontend.
- Redis stores administrator credentials, guest nicknames, posts, comments, message board data, and counters.

## Features

- Kuromi-themed visual design with animated landing and glass-style panels
- Fixed admin identities: `RobinElysia` and `Meow`
- Guest nickname mode without a public registration system
- Admin registration bootstrap flow backed by Redis
- Admin login and guest login
- Post publishing, editing, deletion, comments, and view counts
- Home message board interaction
- Markdown rendering with GFM, KaTeX, and Mermaid
- Image upload for post content

## Tech Stack

- Frontend: `React 19`, `TypeScript`, `Vite`
- UI and motion: `Tailwind CSS 4`, `framer-motion`, `animate.css`, `Radix UI`
- Backend: `Express`
- Storage: `Redis`
- Uploads: `multer`
- Markdown: `@bytemd/react`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `mermaid`

## Repository Structure

```text
.
|-- public/                      # Static assets and uploaded files
|   `-- uploads/posts/           # Uploaded post images
|-- src/
|   |-- components/              # Page components and shared UI
|   |-- hooks/                   # Custom hooks
|   |-- lib/                     # Utilities and request helpers
|   |-- public/                  # Imported fonts and image assets
|   `-- types.ts                 # Shared frontend types
|-- version/                     # Version notes
|-- server.ts                    # Express + Redis production entry
|-- docker-compose.yml           # Full stack container orchestration
|-- Dockerfile                   # App image build file
`-- README.md
```

## Local Development

### Requirements

- Node.js 18+
- Redis 7+

### Install

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Default address:

```text
http://localhost:3000
```

## Environment Variables

The server supports these environment variables:

```bash
PORT=3000
NODE_ENV=development
KUROMI_REDIS_URL=redis://:000745012010psQ@localhost:6379
KUROMI_ALLOWED_ORIGINS=http://localhost:3000
KUROMI_ADMIN_ROBIN_BOOTSTRAP_SECRET=000745012010psQ
KUROMI_ADMIN_MEOW_BOOTSTRAP_SECRET=030101wbb
```

Optional frontend build variable for split-domain deployments:

```bash
VITE_KUROMI_API_BASE_URL=https://your-api.example.com
```

If frontend and backend are served from the same domain through the same Node service or Nginx reverse proxy, you do not need `VITE_KUROMI_API_BASE_URL`.

## Available Commands

- `npm run dev`: start Express with Vite middleware
- `npm run start`: start runtime server
- `npm run build`: build frontend into `dist/`
- `npm run preview`: preview the Vite build
- `npm run lint`: run `tsc --noEmit`
- `npm run clean`: remove `dist/`

## API Overview

### Authentication

- `POST /api/admin/register`
- `POST /api/login`
- `POST /api/guest-login`

### Health

- `GET /api/health`

### Posts

- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET /api/posts/:id/image`

### Comments and Messages

- `POST /api/posts/:id/comments`
- `GET /api/messages`
- `POST /api/messages`

### Upload

- `POST /api/uploads/images`

## Docker Compose Deployment

This repository now includes a production-oriented `docker-compose.yml`.

It starts:

- `kuromi-app`: builds the frontend, runs `server.ts`, and serves both the site and API on port `3000`
- `kuromi-redis`: Redis with password, append-only persistence, restart policy, and external port mapping

### Start

```bash
docker compose up -d --build
```

### Stop

```bash
docker compose down
```

### View logs

```bash
docker compose logs -f
```

### Included Redis settings

- External access enabled through `6379:6379`
- Password fixed to `000745012010psQ`
- AOF persistence enabled with `appendonly yes`
- Snapshot persistence enabled with `save 60 1000`
- Automatic restart enabled with `restart: unless-stopped`
- Data persisted in Docker volume `kuromi-redis-data`

### Default service addresses

- Site and API: `http://localhost:3000`
- Redis: `redis://:000745012010psQ@localhost:6379`

## Ubuntu + Nginx Notes

If you deploy behind Ubuntu Nginx:

- Keep the Node app running. Do not deploy only `dist/` if you still need login, comments, posts, uploads, or Redis-backed APIs.
- Reverse proxy `/api/` and `/uploads/` to the app service.
- If frontend and backend are on different origins, configure:
  - `KUROMI_ALLOWED_ORIGINS`
  - `VITE_KUROMI_API_BASE_URL`

Recommended health check after deployment:

```bash
curl http://127.0.0.1:3000/api/health
```

## Manual Verification Checklist

- Admin registration works for `RobinElysia` / `Meow`
- Admin login succeeds against Redis
- Guest nickname login succeeds
- Message board requests succeed
- Post CRUD succeeds
- Comment submission succeeds
- Image upload succeeds
- `GET /api/health` returns `redisReady: true`

## Security Notes

- The Redis password in `docker-compose.yml` is intentionally fixed to the value you requested. Treat it as a deployment secret and restrict host/network exposure where possible.
- Admin bootstrap secrets should be overridden in real deployments with environment variables.
- Exposing Redis to the public internet is risky. Prefer firewall restrictions or security-group restrictions even if port mapping is enabled.

## Version Notes

Change history is tracked in the `version/` directory.
For this round of delivery, see `version/2.0.4.md`.
