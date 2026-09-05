# Masar API

Education center management SaaS backend built with Cloudflare Workers + Hono + Neon + Drizzle ORM + Clerk.

## Current Stage

**STAGE 1** — Neon database connection (in progress)

## Progress

| Stage | Status |
|-------|--------|
| Stage 0: Scaffold | ✅ Complete |
| Stage 1: Neon Connection | ⏳ Waiting for DATABASE_URL |
| Stage 2: Drizzle ORM | Pending |
| Stage 3: Clerk Auth | Pending |
| Stage 4: CRUD APIs | Pending |
| Stage 5: Sync Endpoints | Pending |
| Stage 6: Expanded Schema | Pending |

## Setup

1. Copy `.dev.vars.example` to `.dev.vars` and fill in your credentials:
   - `DATABASE_URL` - Neon HTTP-compatible connection string

2. Install dependencies: `npm install`

3. Run locally: `npm run dev`

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Neon (serverless Postgres)
- **ORM**: Drizzle ORM
- **Auth**: Clerk (Organizations for multi-tenancy)
