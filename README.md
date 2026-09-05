# Masar API

Education center management SaaS backend built with Cloudflare Workers + Hono + Neon + Drizzle ORM + Clerk.

## Current Status

**ALL STAGES COMPLETE** - Backend is fully implemented and tested.

## Progress Summary

| Stage | Status | Description |
|-------|--------|-------------|
| Stage 0: Scaffold | ✅ Complete | Cloudflare Workers + Hono project initialized, `GET /` returns `{status: "ok"}` |
| Stage 1: Neon Connection | ✅ Complete | `@neondatabase/serverless` installed, `GET /api/ping-db` returns real data from Neon |
| Stage 2: Drizzle ORM | ✅ Complete | Drizzle ORM set up with `students` and `courses` tables |
| Stage 3: Clerk Auth | ✅ Complete | Auth middleware using `jose` + `@clerk/backend`, extracts `orgId` and `userId` from JWT |
| Stage 4: CRUD APIs | ✅ Complete | Tenant-scoped CRUD for `/api/students` and `/api/courses` with soft deletes |
| Stage 5: Sync Endpoints | ✅ Complete | `POST /api/sync/push` and `GET /api/sync/pull?since=` endpoints |

## Verification Results

### Auth Middleware ✅
- Verified with a real Clerk session JWT
- `GET /api/me` correctly returns `userId` and `orgId` extracted from JWT
- Rejected invalid/fake tokens with 401
- Rejected tokens without organization with 401

### Tenant Isolation ✅
- Inserted a record directly with a different `org_id` in the database
- Verified the API with Org A's token does NOT return records with Org B's `org_id`
- All CRUD queries include mandatory `eq(table.orgId, ctx.orgId)` filter
- Records created via API are always scoped to the authenticated user's `org_id`

### Soft Deletes ✅
- DELETE soft-deletes records (sets `deleted_at` timestamp)
- Soft-deleted records excluded from `GET` list queries
- Soft-deleted records included in `GET /api/sync/pull` (for sync propagation)

### Sync Round Trip ✅
- POST `/api/sync/push` correctly upserts records scoped to `org_id`
- GET `/api/sync/pull?since=` returns all updates (including soft-deleted) for the tenant
- Push respects `updated_at` - only overwrites if incoming timestamp is newer

## Architecture

### Multi-Tenancy
- Uses Clerk Organizations for tenant isolation
- Every database record scoped by `org_id` (from Clerk JWT `o.id` claim)
- Auth middleware enforces org membership (401 if no active org)

### Database Schema (Students & Courses)
- **id**: UUID primary key (client-supplied, not auto-generated)
- **org_id**: Text, not null, indexed (Clerk organization ID)
- **updated_at**: Timestamp with timezone, not null
- **deleted_at**: Timestamp with timezone, nullable (soft deletes)
- **students**: name, gender, date_of_birth, phone, email, lead_source, parent_name, parent_phone, school, address, notes, status
- **courses**: name (varchar 255, not null), price (integer - smallest currency unit), payment_type ('monthly' | 'package'), status

### JWT Verification
- Session tokens verified using `jose`'s `jwtVerify` with Clerk JWKS fetched from the issuer's `/.well-known/jwks.json` endpoint
- Uses `crypto.subtle.importKey` for key import (Worker-compatible)

## API Endpoints

### Public
- `GET /` — Health check, returns `{ status: "ok" }`
- `GET /api/ping-db` — Database connectivity check

### Protected (requires `Authorization: Bearer <clerk_session_token>`)
- `GET /api/me` — Returns authenticated user's `orgId` and `userId`
- `GET /api/students` — List students (tenant-scoped, excludes soft-deleted)
- `POST /api/students` — Create student
- `GET /api/students/:id` — Get student by ID
- `PATCH /api/students/:id` — Update student
- `DELETE /api/students/:id` — Soft delete student
- `GET /api/courses` — List courses (tenant-scoped, excludes soft-deleted)
- `POST /api/courses` — Create course
- `GET /api/courses/:id` — Get course by ID
- `PATCH /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Soft delete course
- `POST /api/sync/push` — Upsert records by ID, only overwrites if incoming `updated_at` is newer
- `GET /api/sync/pull?since=<ISO timestamp>` — Pull all records (including soft-deleted) updated since timestamp

## Setup

1. Create `.dev.vars` from `.dev.vars.example`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Fill in:
   - `DATABASE_URL` - Neon HTTP-compatible connection string
   - `CLERK_SECRET_KEY` - Clerk secret key (sk_test_... or sk_live_...)

2. Install dependencies: `npm install`

3. Run locally: `npm run dev`

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Neon (serverless Postgres)
- **ORM**: Drizzle ORM
- **Auth**: Clerk (Organizations for multi-tenancy)
