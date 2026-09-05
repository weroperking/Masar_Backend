# Masar API

Education center management SaaS backend built with Cloudflare Workers + Hono + Neon + Drizzle ORM + Clerk.

## Current Status

**ALL STAGES COMPLETE** — Backend fully implemented and tested end-to-end.

## Progress Summary

| Stage | Status | Description |
|-------|--------|-------------|
| Stage 0: Scaffold | ✅ Complete | Cloudflare Workers + Hono project, `GET /` returns `{status: "ok"}` |
| Stage 1: Neon Connection | ✅ Complete | `@neondatabase/serverless`, `GET /api/ping-db` returns real data |
| Stage 2: Drizzle ORM | ✅ Complete | Schema with students + courses tables |
| Stage 3: Clerk Auth | ✅ Complete | JWT verification via `jose` + Clerk JWKS, `/api/me` protected |
| Stage 4: CRUD APIs | ✅ Complete | Tenant-scoped CRUD with soft deletes |
| Stage 5: Sync Endpoints | ✅ Complete | Push (upsert with conflict resolution) + Pull (since timestamp) |
| Stage 6: Full Schema | ✅ Complete | All 19 tables implemented, CRUD + sync for each |

## Verification Results

### Auth & Multi-Tenancy ✅
- Real Clerk session JWT verified successfully
- `GET /api/me` returns correct `userId` and `orgId` from JWT claims
- Invalid tokens rejected with 401
- Tokens without active organization rejected with 401
- Tenant isolation verified: inserted record with different `org_id` directly into Neon, confirmed it's invisible to queries from a different org's JWT

### CRUD Operations ✅
- POST/GET/PATCH/DELETE tested for all 19 tables
- Soft deletes work correctly (DELETE sets `deleted_at`, excluded from list queries)
- PATCH updates records with new `updated_at` timestamp

### Sync Round Trip ✅
- `POST /api/sync/push`: creates records, updates with newer `updated_at`, skips older records
- `GET /api/sync/pull?since=`: returns all changed records (including soft-deleted) across all tables, scoped to org
- Full round trip tested: push → pull → verify data

## Architecture

### Multi-Tenancy
- Uses Clerk Organizations for tenant isolation
- Every database record has `org_id` derived from the JWT's `o.id` claim
- Auth middleware enforces org membership (401 if no active org)
- All queries include mandatory `.where(eq(table.orgId, ctx.orgId))` filter

### JWT Verification
- Session tokens verified using `jose` library with Clerk JWKS
- JWKS fetched from issuer's `/.well-known/jwks.json` endpoint
- Cache-friendly (module-level caching for subsequent requests)

### Database Schema
All tables follow a consistent pattern:
- **id**: UUID primary key (client-supplied, NOT auto-generated)
- **org_id**: Text, not null, indexed (Clerk organization ID)
- **created_at**: Timestamp with timezone, nullable
- **updated_at**: Timestamp with timezone, not null
- **deleted_at**: Timestamp with timezone, nullable (soft deletes)
- Money fields: integers (smallest currency unit, e.g. piastres)

### Tables
| Table | Entity Fields |
|-------|--------------|
| students | name, gender, date_of_birth, phone, email, lead_source, parent_name, parent_phone, school, address, notes, status |
| courses | name, price, payment_type, status |
| groups | course_id, name, type, days_of_week (json), start_time, end_time, start_date, end_date, session_count, max_students, notes, status |
| attendance_sessions | group_id, course_id, started_at, ended_at, room, status |
| attendance_records | session_id, student_id, status, marked_at |
| assessments | name, type, course_id, semester, date, max_grade, grading_method, status |
| assessment_grades | assessment_id, student_id, grade, graded_at |
| session_payments | student_id, course_id, session_id, type, amount, paid_amount, date, status |
| ledger_entries | type (revenue/expense/refund), category, amount, date, description, related_type, related_id |
| booking_requests | name, phone, course_id, declared_amount, request_date, status |
| products | name, sale_price, cost_price, stock_qty, sold_qty, type |
| course_products | course_id, product_id, is_mandatory, discount_type, discount_value |
| product_sales | product_id, quantity, customer_name, customer_phone, student_id, discount_type, discount_value, subtotal, total, payment_method, sale_date, receipt_number, linked_event_id, notes |
| events | name, date, notes |
| users | name, email, role, branch, linked_employee_name, status |
| message_templates | channel, template_key, body, is_default |
| settings | auto_start_end_sessions, auto_confirm_payment_on_attendance, auto_create_assignment_per_session, free_session_limit_per_student, assignment_grading_method, numeric_max_grade |
| qr_cards | card_number, student_id, print_status, linked_at |
| monthly_subscriptions | student_id, course_id, start_date, end_date, amount, status, payment_method, notes |
| payments | student_id, course_id, month, year, amount_total, amount_paid, status, notes |

## API Endpoints

### Public
- `GET /` — `{ status: "ok" }`
- `GET /api/ping-db` — Database connectivity check

### Protected (requires `Authorization: Bearer <clerk_session_token>`)

All CRUD endpoints follow the pattern: `GET/POST /api/{table}`, `GET/PATCH/DELETE /api/{table}/:id`

List of all tenant-scoped resource endpoints:
- `/api/students`, `/api/courses`
- `/api/groups`, `/api/attendance_sessions`, `/api/attendance_records`
- `/api/assessments`, `/api/assessment_grades`
- `/api/session_payments`, `/api/ledger_entries`, `/api/booking_requests`
- `/api/products`, `/api/course_products`, `/api/product_sales`
- `/api/events`, `/api/users`, `/api/message_templates`
- `/api/settings`, `/api/qr_cards`, `/api/monthly_subscriptions`, `/api/payments`

### Sync Endpoints
- `POST /api/sync/push` — Body: `[{ table: string, records: object[] }]`. Upserts by ID scoped to org, only overwrites if incoming `updated_at` is newer. Returns per-record status.
- `GET /api/sync/pull?since=<ISO timestamp>` — Returns all changed records (including soft-deleted) across all tables, grouped by table name.

### Auth
- `GET /api/me` — Returns `userId` and `orgId` from the authenticated session

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
- **JWT**: jose (Worker-compatible verification)
