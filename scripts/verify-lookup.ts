import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, isNull, eq, sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import {
  encodeLookupCode,
  decodeLookupCode,
  generateLookupPrefix,
  PARENT_FOLLOW_URL_PREFIX,
} from "../src/lib/lookup";
import { resolvePublicLookupCode } from "../src/routes/public-lookup";

const connectionString =
  process.env.DATABASE_URL || "postgresql://testuser:testpass@localhost:5432/testdb";
const pool = new Pool({ connectionString });
const db: any = drizzle(pool, { schema });

function iso(): string {
  return new Date().toISOString();
}
function uuidv(): string {
  return crypto.randomUUID();
}
let pass = 0;
let fail = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  ok ? pass++ : fail++;
}

async function main() {
  const orgAId = "org_A_" + uuidv();
  const orgBId = "org_B_" + uuidv();
  const prefixA = generateLookupPrefix();
  const prefixB = generateLookupPrefix();
  const nowStr = iso();

  await db.insert(schema.subscriptions).values([
    {
      id: uuidv(),
      orgId: orgAId,
      plan: "trial",
      status: "trialing",
      lookupPrefix: prefixA,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
    {
      id: uuidv(),
      orgId: orgBId,
      plan: "trial",
      status: "trialing",
      lookupPrefix: prefixB,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
  ]);

  const studentAId = uuidv();
  const studentALookup = encodeLookupCode(prefixA, studentAId);

  await db.insert(schema.students).values({
    id: studentAId,
    orgId: orgAId,
    name: "Ahmed Hossam",
    status: "active",
    lookupCode: studentALookup,
    createdAt: nowStr,
    updatedAt: nowStr,
  });

  // Second student with attendance/exams/subscription data
  const studentBId = uuidv();
  const studentBLookup = encodeLookupCode(prefixA, studentBId);
  const groupId = uuidv();
  const courseId = uuidv();
  const sessionId = uuidv();
  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const startOfMonth = `${ym}-01`;
  const endOfMonth = `${ym}-31`;

  await db.insert(schema.students).values({
    id: studentBId,
    orgId: orgAId,
    name: "Layla Salem",
    status: "active",
    lookupCode: studentBLookup,
    createdAt: nowStr,
    updatedAt: nowStr,
  });
  await db.insert(schema.courses).values({
    id: courseId,
    orgId: orgAId,
    name: "Math KG1",
    price: 0,
    paymentType: "monthly",
    updatedAt: nowStr,
  });
  await db.insert(schema.groups).values({
    id: groupId,
    orgId: orgAId,
    courseId,
    name: "Group Red",
    type: "group",
    daysOfWeek: [],
    updatedAt: nowStr,
  });
  await db.insert(schema.attendanceSessions).values({
    id: sessionId,
    orgId: orgAId,
    groupId,
    courseId,
    startedAt: nowStr,
    status: "live",
    updatedAt: nowStr,
  });
  await db.insert(schema.enrollments).values({
    id: uuidv(),
    orgId: orgAId,
    studentId: studentBId,
    groupId,
    courseId,
    enrolledAt: nowStr,
    status: "active",
    updatedAt: nowStr,
  });
  await db.insert(schema.attendanceRecords).values({
    id: uuidv(),
    orgId: orgAId,
    sessionId,
    studentId: studentBId,
    status: "present",
    markedAt: nowStr,
    updatedAt: nowStr,
  });
  await db.insert(schema.attendanceRecords).values({
    id: uuidv(),
    orgId: orgAId,
    sessionId,
    studentId: studentBId,
    status: "absent",
    markedAt: nowStr,
    updatedAt: nowStr,
  });
  const assessmentId = uuidv();
  await db.insert(schema.assessments).values({
    id: assessmentId,
    orgId: orgAId,
    name: "Midterm Math",
    type: "test",
    courseId,
    maxGrade: 100,
    gradingMethod: "numeric",
    updatedAt: nowStr,
  });
  await db.insert(schema.assessmentGrades).values({
    id: uuidv(),
    orgId: orgAId,
    assessmentId,
    studentId: studentBId,
    grade: "85",
    gradedAt: nowStr,
    updatedAt: nowStr,
  });
  await db.insert(schema.monthlySubscriptions).values({
    id: uuidv(),
    orgId: orgAId,
    studentId: studentBId,
    courseId,
    startDate: startOfMonth,
    endDate: endOfMonth,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 1000,
    amountTotal: 1000,
    amountPaid: 1000,
    status: "active",
    paymentMethod: "cash",
    updatedAt: nowStr,
  });

  console.log("setup complete: 2 orgs, 2 students, attendance/exam/subscription data");

  // ---- TEST 1: round-trip encode/decode ----
  console.log("\n=== TEST 1: round-trip encode/decode ===");
  const decodedA = decodeLookupCode(studentALookup);
  console.log("orgA prefix      :", prefixA);
  console.log("studentA id       :", studentAId);
  console.log("lookup_code       :", studentALookup);
  console.log("decoded           :", JSON.stringify(decodedA));
  check(
    "decode yields original prefix + student id",
    decodedA?.orgPrefix === prefixA && decodedA?.studentId === studentAId,
  );
  check("lookup_code is URL-safe (no / + = in path)", !/[+/=]/.test(studentALookup));

  // ---- TEST 2: dashboard URL is hardcoded canonical domain ----
  console.log("\n=== TEST 2: dashboard URL ===");
  const urlB = `${PARENT_FOLLOW_URL_PREFIX}/${studentBLookup}`;
  console.log("dashboard url    :", urlB);
  check(
    "url == https://app.masar.top/p/s/{lookup_code}",
    urlB === `https://app.masar.top/p/s/${studentBLookup}`,
  );

  // ---- TEST 3: migration backfill SQL == app encoder ----
  console.log("\n=== TEST 3: migration backfill == app encoder ===");
  const samplePrefix = generateLookupPrefix();
  const sampleSid = uuidv();
  const appCode = encodeLookupCode(samplePrefix, sampleSid);
  const res = await pool.query<{ code: string }>(
    `SELECT rtrim(
       translate(
         replace(encode(convert_to(concat($1::text, ':', $2::text), 'UTF8'), 'base64'), E'\n', ''),
         '+/', '-_'
       ), '='
     ) AS code`,
    [samplePrefix, sampleSid],
  );
  const sqlCode = res.rows[0].code;
  console.log("app  code        :", appCode);
  console.log("sql  code        :", sqlCode);
  check("SQL backfill matches app encodeLookupCode", appCode === sqlCode);

  // ---- TEST 4: end-to-end resolve via the REAL resolve function ----
  console.log("\n=== TEST 4: e2e resolve (student with full data) ===");
  console.log("GET /public/lookup/" + studentBLookup);
  const resolved = await resolvePublicLookupCode(db, studentBLookup);
  console.log("response         :", JSON.stringify(resolved, null, 2));
  check("resolve returns 200-equivalent data", resolved !== null);
  check("name == 'Layla Salem'", resolved?.name === "Layla Salem");
  check(
    "attendance attended==1, missed==1",
    resolved?.attendance.attended === 1 && resolved?.attendance.missed === 1,
  );
  check("exams has Midterm Math / 85", resolved?.exams[0]?.name === "Midterm Math" && resolved?.exams[0]?.grade === "85");
  check("subscription.status == 'active'", resolved?.subscription.status === "active");

  // Ahmed has no attendance/exam/subscription rows -> still resolves, zeros.
  const resolvedA = await resolvePublicLookupCode(db, studentALookup);
  console.log("\n=== TEST 4b: resolve student with no activity ===");
  console.log("GET /public/lookup/" + studentALookup);
  console.log("response         :", JSON.stringify(resolvedA, null, 2));
  check("resolves (zeros)", resolvedA?.name === "Ahmed Hossam" && resolvedA?.attendance.attended === 0);

  // ---- TEST 5: cross-org isolation ----
  console.log("\n=== TEST 5: cross-org isolation ===");
  const forgedCode = encodeLookupCode(prefixB, studentAId); // org B prefix + org A student
  console.log("forged code      :", forgedCode);
  const forged = await resolvePublicLookupCode(db, forgedCode);
  console.log("forged response  :", forged);
  check("org B cannot read org A student -> null", forged === null);

  // ---- TEST 6: malformed / unknown codes -> null ----
  console.log("\n=== TEST 6: malformed / unknown -> null ===");
  const bad = await resolvePublicLookupCode(db, "!!!not-valid-base64!!!");
  const unknown = await resolvePublicLookupCode(
    db,
    encodeLookupCode(generateLookupPrefix(), uuidv()),
  );
  console.log("malformed ->", bad);
  console.log("unknown   ->", unknown);
  check("malformed -> null", bad === null);
  check("unknown prefix -> null", unknown === null);

  // ---- TEST 7: student code must match org prefix (resolve consistency) ----
  console.log("\n=== TEST 7: stored lookup_code == re-encoded from prefix+id ===");
  const [row] = await db
    .select({ id: schema.students.id, lookupCode: schema.students.lookupCode, prefix: schema.subscriptions.lookupPrefix })
    .from(schema.students)
    .innerJoin(schema.subscriptions, eq(schema.subscriptions.orgId, schema.students.orgId))
    .where(eq(schema.students.id, studentAId));
  const recomputed = encodeLookupCode(row.prefix, row.id);
  console.log("stored   :", row.lookupCode);
  console.log("recomputed:", recomputed);
  check("stored lookup_code matches encodeLookupCode(prefix, id)", row.lookupCode === recomputed);

  // ---- TEST 8: DB-level unique constraint on lookup_code ----
  console.log("\n=== TEST 8: DB-level unique constraint ===");
  let uniqueViolated = false;
  let dupMsg = "";
  try {
    await db.insert(schema.students).values({
      id: uuidv(),
      orgId: orgAId,
      name: "Dup",
      status: "active",
      lookupCode: studentALookup,
      updatedAt: nowStr,
    });
  } catch (e: any) {
    const full = `${e?.message || ""} ${e?.cause ? JSON.stringify(e.cause) : ""} ${e?.code || ""}`;
    uniqueViolated = /students_lookup_code_unique|duplicate|23505/.test(full);
    dupMsg = (e?.cause && typeof e.cause === "object" && "message" in e.cause
      ? (e.cause as any).message
      : e?.message)
      ?.split("\n")[0];
    console.log("insert error     :", dupMsg);
  }
  check("duplicate lookup_code rejected by DB unique constraint", uniqueViolated);

  console.log(`\n==== SUMMARY: ${pass} passed, ${fail} failed ====`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 2);
}

main().catch((e) => {
  console.error("HARNESS ERROR", e);
  process.exit(1);
});
