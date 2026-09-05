# Masar API

Education center management SaaS backend built with Cloudflare Workers + Hono + Neon + Drizzle ORM + Clerk.

## Current Status

**All 6 Stages Complete**

## Progress Summary

| Stage | Status | Description |
|-------|--------|-------------|
| Stage 0: Scaffold | ✅ Complete | Cloudflare Workers + Hono project initialized, `GET /` returns `{status: "ok"}` |
| Stage 1: Neon Connection | ✅ Complete | `@neondatabase/serverless` installed, `GET /api/ping-db` returns real data from Neon |
| Stage 2: Drizzle ORM | ✅ Complete | Drizzle ORM set up with `students` and `courses` tables (uuid id, org_id, updated_at, deleted_at) |
| Stage 3: Clerk Auth | ✅ Complete | Auth middleware using `@clerk/backend`, extracts orgId and userId, `GET /api/me` protected endpoint |
| Stage 4: CRUD APIs | ✅ Complete | Tenant-scoped CRUD for `/api/students` and `/api/courses` with soft deletes |
| Stage 5: Sync Endpoints | ✅ Complete | `POST /api/sync/push` and `GET /api/sync/pull?since=` endpoints |

## Architecture

### Multi-Tenancy
- Uses Clerk Organizations for tenant isolation
- Every database record scoped by `org_id`
- Auth middleware enforces org membership (401 if no active org)

### Database Schema (Students & Courses)
- **id**: UUID primary key (client-supplied, not auto-generated)
- **org_id**: Text, not null, indexed (Clerk organization ID)
- **updated_at**: Timestamp with timezone, not null
- **deleted_at**: Timestamp with timezone, nullable (soft deletes)
- **students**: name, gender, date_of_birth, phone, email, lead_source, parent_name, parent_phone, school, address, notes, status
- **courses**: name (varchar 255, not null), price (integer, smallest currency unit), payment_type ('monthly' | 'package'), status

### Money Fields
- All money fields stored as integers (smallest currency unit, e.g. piastres)

## API Endpoints

### Public
- `GET /` — Health check, returns `{ status: "ok" }`
- `GET /api/ping-db` — Database connectivity check

### Protected (requires Clerk session token)
- `GET /api/me` — Returns authenticated user's orgId and userId
- `GET /api/students` — List students (tenant-scoped)
- `POST /api/students` — Create student
- `GET /api/students/:id` — Get student by ID
- `PATCH /api/students/:id` — Update student
- `DELETE /api/students/:id` — Soft delete student
- `GET /api/courses` — List courses (tenant-scoped)
- `POST /api/courses` — Create course
- `GET /api/courses/:id` — Get course by ID
- `PATCH /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Soft delete course
- `POST /api/sync/push` — Upsert records by ID, only overwrites if incoming `updated_at` is newer
- `GET /api/sync/pull?since=<ISO timestamp>` — Pull all records (including soft-deleted) updated since timestamp

### Auth
All protected routes require: `Authorization: Bearer <clerk_session_token>`

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

## Testing

### To test auth middleware end-to-end:
1. Sign in to the frontend with a Clerk account that belongs to an organization
2. Open browser devtools -> Network tab
3. Find an API request made to the backend
4. Copy the `Authorization: Bearer <session_token>` header
5. Use it in curl:
   ```bash
   curl -H "Authorization: Bearer <your_session_token>" http://localhost:8787/api/me
   ```

### Testing tenant isolation:
Once you have two session tokens from different Clerk organizations, you can verify that records created by one org are not visible to another org:
   ```bash
   # Create a student with org A token
   curl -X POST -H "Authorization: Bearer <org_a_token>" -H "Content-Type: application/json" \
     -d '{"id":"test-uuid","name":"Test Student","updated_at":"2025-01-01T00:00:00Z"}' \
     http://localhost:8787/api/students
   
   # Try to access with org B token - should get 404
   curl -H "Authorization: Bearer <org_b_token>" http://localhost:8787/api/students/test-uuid
   ```

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Neon (serverless Postgres)
- **ORM**: Drizzle ORM
- **Auth**: Clerk (Organizations for multi-tenancy)
