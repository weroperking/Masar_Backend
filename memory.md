# Masar Backend — Memory File

> Created 2026-09-10 to give new conversations instant project context.
> Read this before touching code so you don't repeat what was already figured out.

---

## 1. Project at a Glance

| Stack | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Hono v4 |
| DB | Neon PostgreSQL (serverless HTTP driver) |
| ORM | Drizzle ORM |
| Auth | Clerk JWT (verify-only, no SDK login flow) |
| Deploy target | `masar-api.weroperking.workers.dev` |

**Purpose:** Multi-tenant education/course-management API. Frontend is a web app running inside a sandboxed Google AI Studio iframe (dynamic origin).

---

## 2. Repo Structure

```
src/
├── index.ts              # Main app, all routes, CORS
├── db/
│   ├── index.ts          # drizzle ORM instance (Neon HTTP)
│   └── schema.ts         # All 22 table definitions
├── routes/
│   ├── sync.ts           # /api/sync/pull + /api/sync/push (multi-table sync)
│   ├── students.ts, courses.ts, groups.ts, ...  # Single-table CRUD
│   ├── me.ts             # GET /api/me → {userId, orgId}
│   └── ping-db.ts        # Health check
├── lib/
│   └── crud.ts           # Generic CRUD factory used by most routes
├── middleware/
│   └── auth.ts           # Clerk JWT middleware (verifyToken via JWKS)
└── ...
```

---

## 3. Key Architectural Decisions

### 3.1 Multi-Tenancy
Every table has `org_id` (text, NOT NULL), `updated_at`, `deleted_at`, `created_at`.  
All SELECT queries filter by `orgId = <current org>` + `deleted_at IS NULL`.

### 3.2 Auth Flow
1. Frontend gets Clerk session token → sends as `Authorization: Bearer <token>`
2. `auth.ts` middleware:
   - Reads `CLERK_SECRET_KEY` from Worker env (set via `wrangler secret put CLERK_SECRET_KEY`)
   - Decodes JWT header + payload unverified to get `iss`
   - Fetches JWKS from `${iss}/.well-known/jwks.json`
   - Verifies signature with RSASSA-PKCS1-v1_5 + SHA-256
   - Extracts `sub` → userId, `o.id` → orgId
3. Frontend context: `org_3IurnHEfyJPaqw5vXlz8JbzQMba`, user: `user_3IupLBxRozfUOdlTY4TMRwnxxLP`

### 3.3 CRUD Factory (`src/lib/crud.ts`)
- POST generates `id` via `crypto.randomUUID()` because Neon tables have NO default on `id`.
- All routes mounted with `app.use("/api/<table>/*", auth)`.

### 3.4 Sync Protocol (`/api/sync/pull` + `/api/sync/push`)
- `pull?table=...&since=ISO_TIMESTAMP` → returns all rows for org where `updated_at > since`
- `push` accepts **array** of `{ table, records: [...] }`
- **CRITICAL:** Frontend sends `updated_at`/`deleted_at` as **millisecond numbers** (epoch ms). Server must convert to ISO string before insert/update. This was a live bug — see §5.

---

## 4. Database & Migrations

### Current Tables (22 in schema, 23 in Neon after room column)
- From migration `0000_loose_famine.sql` (Stage 6): 21 tables (students, courses, groups, attendance_sessions, attendance_records, assessments, assessment_grades, products, course_products, session_payments, revenue_entries, expense_entries, refund_entries, booking_requests, product_sales, events, users, message_templates, settings, qr_cards, monthly_subscriptions)
- From migration `0001_glamorous_tomorrow_man.sql`: `enrollments`
- Manual push: `ALTER TABLE groups ADD COLUMN room text;`

**`monthly_subscriptions` is NOT from a recent Stage 7 — it was added in Stage 6 (migration 0000).**

### Running Migrations
```bash
DATABASE_URL="postgresql://..." npx drizzle-kit generate   # creates drizzle/000X_*.sql
DATABASE_URL="postgresql://..." npx drizzle-kit push      # applies to Neon
```

`drizzle-kit push` may prompt interactively for column conflicts in non-TTY shells. For simple ALTER TABLE, run the SQL directly against Neon.

### Neon Connection
```
postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require
# (stored in .dev.vars locally, as wrangler secret in prod)
```

---

## 5. Known Bugs Fixed (Do Not Re-Introduce)

| Bug | Fix |
|---|---|
| POST /api/crud returned 500 because `id` column has no DB default | `crud.ts` POST now does `id: body.id \|\| crypto.randomUUID()` |
| `sync/push` 500 — frontend sends epoch ms timestamps, DB expects ISO strings | Convert `updated_at`/`deleted_at` with `new Date(x).toISOString()` if number |
| `sync/push` 500 — empty-string `deleted_at` → NULL | `deletedAtStr = deleted_at ? ... : null` |
| CORS blocked frontend in sandboxed iframe | `app.use("/api/*", cors({ origin: "*" }))` — **TODO: lock to fixed domain** |

---

## 6. CORS & Frontend

- **Current (dev/temp):** `origin: "*"` on `/api/*`
- **TODO before production:** restrict to the real fixed frontend domain
- Frontend origin during dev is `https://aistudio.google.com` (Google AI Studio preview iframe — dynamic, changes each session)

```typescript
import { cors } from "hono/cors";
app.use("/api/*", cors({ origin: "*" })); // TODO: lock down
```

---

## 7. Deployment

```bash
# Deploy (token must be inline — does not persist between bash calls)
CLOUDFLARE_API_TOKEN=<your-token-here> npx wrangler deploy --minify

# Tail live logs
CLOUDFLARE_API_TOKEN=... npx wrangler tail --format pretty
```

**Live URL:** `https://masar-api.weroperking.workers.dev`

**Secrets** (set via `wrangler secret put <name>`):
- `CLERK_SECRET_KEY` — Clerk backend secret (sk_test_...)
- `DATABASE_URL` — stored in `.dev.vars` for local, wrangler secret for prod

**Do NOT commit `.dev.vars`.**

---

## 8. Generating Test Clerk JWTs (For Local API Testing)

```bash
CLERK_SECRET_KEY=sk_test_... node -e "
  const { createClerkClient } = require('@clerk/backend');
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  clerk.sessions.createSession({ userId: 'user_3IupLBxRozfUOdlTY4TMRwnxxLP' })
    .then(s => clerk.sessions.getToken(s.id))
    .then(t => console.log(t.jwt));
"
```

⚠️ Tokens expire in ~60 seconds. Generate and use in the same script/session.

Real user in org: `user_3IupLBxRozfUOdlTY4TMRwnxxLP`  
Real org: `org_3IurnHEfyJPaqw5vXlz8JbzQMba`

---

## 9. Current Route Map

| Path | Method | Auth | Notes |
|---|---|---|---|
| `/` | GET | No | Health: `{ status: "ok" }` |
| `/api/me` | GET | Yes | Returns `{ userId, orgId }` |
| `/api/ping-db` | GET | No | DB connectivity check |
| `/api/<table>` | GET | Yes | List all (org-scoped, non-deleted) |
| `/api/<table>/<id>` | GET | Yes | Single record |
| `/api/<table>` | POST | Yes | Create (generates UUID) |
| `/api/<table>/<id>` | PATCH | Yes | Update |
| `/api/<table>/<id>` | DELETE | Yes | Soft delete (`deleted_at = now`) |
| `/api/sync/pull` | GET | Yes | `?table=...&since=ISO_TIMESTAMP` |
| `/api/sync/push` | POST | Yes | Body: `[{ table, records }]` array |

Tables with CRUD: students, courses, groups, attendance_sessions, attendance_records, assessments, assessment_grades, products, course_products, session_payments, revenue_entries, expense_entries, refund_entries, booking_requests, product_sales, events, users, message_templates, settings, qr_cards, monthly_subscriptions, enrollments

---

## 10. Important Gotchas

- **`wrangler dev`** must be run from project dir; `.dev.vars` auto-loads secrets.
- **`npx wrangler deploy`** needs `CLOUDFLARE_API_TOKEN` inline — bash does not persist env vars between tool calls.
- **Neon HTTP driver** requires template tag syntax (`sql\`SELECT ...\``), not `sql("SELECT $1", [val])`.
- **No npm scripts for drizzle** — use `npx drizzle-kit generate` / `npx drizzle-kit push` directly.
- **UUID generation** must happen in app code, not DB — Neon tables have no `default randomUUID()`.
- **Sync timestamps** — frontend sends epoch ms, DB stores ISO strings. Always normalize on push.
- **`CLERK_JWT_KEY` in `.dev.vars`** is the public key only — cannot generate test tokens with it. Use `CLERK_SECRET_KEY` + `createClerkClient` instead.

---

## 11. Recent Commit History (on main)

```
6218467 fix: convert millisecond timestamps to ISO strings in sync/push; handle empty deleted_at
b4139ff feat: add CORS middleware allowing all origins (dev only, TODO: lock down for prod)
9da5adf feat: add room column to groups table
c410cdc fix: generate UUID for id column in CRUD factory since Neon has no default
d91b2c2 feat: add enrollments table, CRUD routes, sync support; add 3 tables via migration
289bff6 Stage 6: expand schema to all 19 tables with CRUD routes and sync
```

---

## 12. Next Steps / Open TODOs

- [ ] Lock CORS `origin` to fixed production frontend domain (currently `*`)
- [ ] Consider adding `id` default (`randomUUID()`) to schema so DB generates IDs (would require migration)
- [ ] Add proper error logging to sync/push for frontend debugging
- [ ] Add integration tests for sync push with real epoch ms timestamps
