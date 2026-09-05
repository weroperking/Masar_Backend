# Backend Agent Prompt — للاستخدام في GitHub Codespaces مع Claude Code (أو أي coding agent تاني بيشتغل في terminal)

> الصق البرومبت ده كامل كأول رسالة للـ agent في الـ Codespace. مكتوب عشان يمشي خطوة خطوة ويتأكد من كل حاجة قبل ما يكمل، مش يبني كل حاجة مرة واحدة على عمياني.

---

```
You are setting up the backend for an education-center management SaaS 
(the frontend already exists separately, built in Google AI Studio with 
React + Vite + Dexie.js — you are NOT touching that project, this is a 
brand new, separate backend repo).

STACK: Cloudflare Workers + Hono (routing) + Neon (serverless Postgres) 
+ Drizzle ORM + Clerk (auth & multi-tenancy via Clerk Organizations)

Work incrementally and verify each stage actually works before moving to 
the next. Do not skip verification steps. Show me the output/result of 
each verification before proceeding.

=====================================================================
STAGE 0 — Project scaffold
=====================================================================
1. Initialize a new Cloudflare Workers project using Hono as the 
   template (`npm create cloudflare@latest` with the Hono option, or 
   manually scaffold with hono + wrangler if the interactive CLI isn't 
   scriptable in this environment).
2. Run it locally with `wrangler dev` and confirm a basic GET / route 
   returns `{ status: "ok" }`. Show me this working before continuing.
3. Set up git, commit this baseline.

=====================================================================
STAGE 1 — Connect Neon
=====================================================================
1. Install `@neondatabase/serverless`.
2. I will provide a Neon connection string (HTTP-compatible, i.e. the 
   one ending in a form usable by the serverless driver, not the raw 
   TCP one). Ask me for it if I haven't given it yet — do not invent 
   a placeholder and pretend it works.
3. Store it as a Wrangler secret: `wrangler secret put DATABASE_URL` 
   (for production) AND add it to `.dev.vars` for local dev (make sure 
   `.dev.vars` is gitignored).
4. Create a single test route `GET /api/ping-db` that runs `SELECT 1` 
   via the Neon driver and returns the result as JSON.
5. Run `wrangler dev` again and hit `/api/ping-db` — show me the actual 
   response. Do not proceed until this returns real data from Neon, 
   not a mocked/assumed response.

=====================================================================
STAGE 2 — Drizzle ORM setup
=====================================================================
1. Install `drizzle-orm` and `drizzle-kit`.
2. Set up `drizzle.config.ts` pointed at the Neon connection string.
3. Create an initial schema file `src/db/schema.ts` with just TWO 
   tables to start (we will expand later): `students` and `courses`.
   Every table must include:
   - id (uuid, primary key — NOT auto-generated, the client always 
     supplies the UUID so client/server IDs match)
   - org_id (text, not null, indexed) — this is the Clerk organization ID
   - updated_at (timestamptz, not null)
   - deleted_at (timestamptz, nullable) — for soft deletes
   Plus entity fields:
   - students: name, gender, date_of_birth, phone, email, 
     lead_source, parent_name, parent_phone, school, address, notes, 
     status
   - courses: name, price, payment_type ('monthly' | 'package'), 
     status
4. Run `drizzle-kit generate` then `drizzle-kit push` (or migrate, 
   whichever this Drizzle version uses) against the real Neon database.
5. Verify the tables actually exist in Neon (query them via the 
   ping-db-style route, or via Neon's own SQL console if accessible) 
   before continuing.

=====================================================================
STAGE 3 — Clerk auth middleware
=====================================================================
1. I will provide a Clerk Secret Key. Store it as a Wrangler secret 
   (`CLERK_SECRET_KEY`) and in `.dev.vars` for local dev.
2. Install `@clerk/backend`.
3. Write a Hono middleware that:
   - Reads the `Authorization: Bearer <token>` header
   - Verifies the session token using Clerk's backend SDK
   - Extracts `orgId` and `userId` from the verified session claims
   - Returns 401 if verification fails, or if there's no active 
     organization on the session (a user must belong to an academy 
     org to use any API route)
   - Attaches `orgId` and `userId` to the Hono context (`c.set(...)`) 
     so route handlers can read them
4. Create a protected test route `GET /api/me` that just returns the 
   `orgId` and `userId` from context.
5. IMPORTANT: to actually test this end-to-end I need a real Clerk 
   session token from a signed-in user. Tell me clearly what you need 
   from me to test this (e.g. "sign in on the frontend/Clerk's hosted 
   sign-in page, open browser devtools, find the session token, paste 
   it here") — do not fabricate a fake token and claim the test passed.

=====================================================================
STAGE 4 — Tenant-scoped CRUD for students & courses
=====================================================================
1. Write a helper `withTenant()` (or similar) that wraps every Drizzle 
   query with a mandatory `.where(eq(table.orgId, ctx.orgId))` — make 
   it structurally hard to write a query that forgets this filter.
2. Implement basic CRUD routes for students and courses:
   GET/POST /api/students, GET/PATCH/DELETE /api/students/:id
   GET/POST /api/courses, GET/PATCH/DELETE /api/courses/:id
   All protected by the Clerk middleware from Stage 3, all scoped by 
   org_id via withTenant().
3. Deletes should be soft (set deleted_at), not actual row deletion.
4. Test creating a student and a course for one org, then verify (by 
   testing with a second Clerk org/token if possible, or at minimum 
   by reasoning through the code) that a different org_id cannot see 
   or modify them.

=====================================================================
STAGE 5 — Sync endpoints (only after Stage 4 is verified working)
=====================================================================
1. POST /api/sync/push — body: `{ table: string, records: object[] }[]`. 
   For each group, upsert by id scoped to org_id, only overwriting a row 
   if the incoming updated_at is newer than what's stored. Return 
   per-record status.
2. GET /api/sync/pull?since=<ISO timestamp> — return all rows (including 
   soft-deleted ones) across students & courses where org_id matches 
   and updated_at > since, grouped by table name.
3. Test the full round trip: push a fake pending record, then pull with 
   an old `since` timestamp and confirm it comes back.

=====================================================================
STAGE 6 — Expand schema to the rest of the tables (only after Stage 5 works)
=====================================================================
Once students+courses sync end-to-end correctly, ask me to confirm, 
then extend the schema.ts and the sync logic to cover the remaining 
tables from the frontend's Dexie schema: groups, attendance_sessions, 
attendance_records, assessments, assessment_grades, products, 
course_products, session_payments, revenue_entries, expense_entries, 
refund_entries, booking_requests, product_sales, events, users, 
message_templates, settings, qr_cards, monthly_subscriptions.

Do NOT jump to this stage until I explicitly confirm Stage 5 is working.

=====================================================================
GENERAL RULES
=====================================================================
- Never claim a step "works" without showing me actual command output 
  or an actual HTTP response — no assumptions, no "this should work now"
- If you're missing a credential or piece of information from me 
  (connection strings, API keys, tokens), stop and ask explicitly — 
  do not invent placeholder values and continue as if they're real
- Money fields: store as integers (smallest currency unit, e.g. piastres) 
  everywhere in this schema, never floats
- Keep a running note in a README.md in this repo of what stage we're 
  on and what's been verified, so if we come back to this later we know 
  exactly where we left off
```

---

## نصيحة استخدام

- لصق البرومبت ده مرة واحدة بس في أول رسالة
- الـ agent مفروض يوقف عند كل Stage ويستنى تأكيد منك (خصوصًا Stage 1 و3 اللي محتاجين منك تدّيله credentials حقيقية: Neon connection string، Clerk Secret Key، وبعدين Clerk session token للاختبار)
- **متدّهوش الـ credentials دي جوه الشات هنا معايا أو في أي مكان تاني غير الـ Codespace نفسه** — لو محتاج تسجلهم حط `.dev.vars` وتأكد إنه في `.gitignore`
