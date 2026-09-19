import { Hono, type Context } from "hono";
import type { AppEnv } from "../types";
import { createDb, schema } from "../db";
import { eq, and, gte } from "drizzle-orm";

const app = new Hono<AppEnv>();

const tenantTables: Record<string, any> = {
  students: schema.students,
  courses: schema.courses,
  groups: schema.groups,
  attendanceSessions: schema.attendanceSessions,
  attendanceRecords: schema.attendanceRecords,
  assessments: schema.assessments,
  assessmentGrades: schema.assessmentGrades,
  products: schema.products,
  courseProducts: schema.courseProducts,
  sessionPayments: schema.sessionPayments,
  revenueEntries: schema.revenueEntries,
  expenseEntries: schema.expenseEntries,
  refundEntries: schema.refundEntries,
  bookingRequests: schema.bookingRequests,
  productSales: schema.productSales,
  events: schema.events,
  users: schema.users,
  messageTemplates: schema.messageTemplates,
  settings: schema.settings,
  qrCards: schema.qrCards,
  monthlySubscriptions: schema.monthlySubscriptions,
  enrollments: schema.enrollments,
};

function encodeBase64(data: Uint8Array | ArrayBufferLike): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getKek(kekBase64: string): Uint8Array {
  if (!kekBase64) {
    throw new Error("KEK not configured");
  }
  return decodeBase64(kekBase64);
}

async function getKekKey(kekBase64: string): Promise<CryptoKey> {
  const kekBuffer = getKek(kekBase64);
  return crypto.subtle.importKey(
    "raw",
    kekBuffer,
    { name: "AES-CTR", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptDekAtRest(kekBase64: string, dek: Uint8Array): Promise<string> {
  const kekKey = await getKekKey(kekBase64);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CTR", counter: iv, length: 128 },
    kekKey,
    dek
  );

  const result = new Uint8Array(iv.length + (encrypted as ArrayBuffer).byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return encodeBase64(result);
}

async function decryptDekAtRest(kekBase64: string, encryptedDek: string): Promise<Uint8Array> {
  const dekBytes = decodeBase64(encryptedDek);
  const iv = dekBytes.slice(0, 16);
  const ciphertext = dekBytes.slice(16);

  const kekKey = await getKekKey(kekBase64);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter: iv, length: 128 },
    kekKey,
    ciphertext
  );

  return new Uint8Array(decrypted);
}

async function getOrCreateOrgDek(
  db: ReturnType<typeof createDb>,
  orgId: string,
  kekBase64: string
): Promise<Uint8Array> {
  const existing = await db
    .select()
    .from(schema.syncKeys)
    .where(eq(schema.syncKeys.orgId, orgId))
    .limit(1);

   if (existing.length > 0) {
    return decryptDekAtRest(kekBase64, existing[0].dekEncrypted);
  }

  const dekBuffer = crypto.getRandomValues(new Uint8Array(32));
  const dekEncrypted = await encryptDekAtRest(kekBase64, dekBuffer);
  const now = new Date().toISOString();

  await db.insert(schema.syncKeys).values({
    id: crypto.randomUUID(),
    orgId,
    dekEncrypted,
    createdAt: now,
    updatedAt: now,
  });

  return dekBuffer;
}

async function getOrStoreDeviceKey(
  db: ReturnType<typeof createDb>,
  orgId: string,
  publicKeyBase64: string,
  wrappedDek: string
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(publicKeyBase64)
  );
  const publicKeyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const existing = await db
    .select()
    .from(schema.syncDeviceKeys)
    .where(eq(schema.syncDeviceKeys.publicKeyHash, publicKeyHash))
    .limit(1);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (existing.length > 0) {
    await db
      .update(schema.syncDeviceKeys)
      .set({
        wrappedDek,
        expiresAt: expiresAt.toISOString(),
      })
      .where(eq(schema.syncDeviceKeys.id, existing[0].id));
  } else {
    await db.insert(schema.syncDeviceKeys).values({
      id: crypto.randomUUID(),
      orgId,
      publicKeyHash,
      wrappedDek,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  return publicKeyHash;
}

async function getDekFromHeader(
  c: Context<AppEnv>,
  db: ReturnType<typeof createDb>,
  orgId: string,
  kekBase64: string
): Promise<CryptoKey | null> {
  const authHeader = c.req.header("X-Sync-Auth");
  if (!authHeader) return null;

  let publicKeyHash: string;
  try {
    const authData = JSON.parse(new TextDecoder().decode(decodeBase64(authHeader)));
    publicKeyHash = authData.publicKeyHash;
  } catch {
    return null;
  }

  const deviceKeys = await db
    .select()
    .from(schema.syncDeviceKeys)
    .where(
      and(
        eq(schema.syncDeviceKeys.orgId, orgId),
        eq(schema.syncDeviceKeys.publicKeyHash, publicKeyHash),
        gte(schema.syncDeviceKeys.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);

  if (deviceKeys.length === 0) return null;
  if (new Date(deviceKeys[0].expiresAt) < new Date()) return null;

  const dekBuffer = await getOrCreateOrgDek(db, orgId, kekBase64);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      dekBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return key;
  } catch {
    return null;
  }
}

async function encryptPayload(dek: CryptoKey, payload: any): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    dek,
    encoded
  );

  const combined = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + combined.length);
  result.set(iv, 0);
  result.set(combined, iv.length);

  return encodeBase64(result);
}

async function decryptPayload(dek: CryptoKey, encryptedData: string): Promise<any> {
  const combined = decodeBase64(encryptedData);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    dek,
    ciphertext
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

async function decryptEnvelope(
  dek: CryptoKey,
  envelope: { v: number; iv: string; ct: string }
): Promise<any> {
  if (!envelope || !envelope.iv || !envelope.ct) {
    throw new Error("Invalid envelope: missing iv or ct");
  }
  const iv = decodeBase64(envelope.iv);
  const ct = decodeBase64(envelope.ct);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    dek,
    ct
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

app.post("/handshake", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const kekBase64 = c.env.KEK as string;
  const body = await c.req.json<{ devicePublicKey: string }>();

  if (!body.devicePublicKey) {
    return c.json({ error: "Missing devicePublicKey" }, 400);
  }

  if (!kekBase64) {
    return c.json({ error: "KEK not configured" }, 500);
  }

  try {
    const publicKeyDer = decodeBase64(body.devicePublicKey);

    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );

    const dekBuffer = await getOrCreateOrgDek(db, orgId, kekBase64);

    const wrappedDek = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      dekBuffer
    );

    const wrappedDekBase64 = encodeBase64(new Uint8Array(wrappedDek));

    const publicKeyHash = await getOrStoreDeviceKey(
      db,
      orgId,
      body.devicePublicKey,
      wrappedDekBase64
    );

    return c.json({
      wrappedDek: wrappedDekBase64,
      publicKeyHash,
      algorithm: "RSA-OAEP",
    });
  } catch (err: any) {
    console.error("[sync/handshake] error", err);
    return c.json({ error: "Handshake failed" }, 500);
  }
});

app.post("/push", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const kekBase64 = c.env.KEK as string;
  const body = await c.req.json<{ operations: SyncOperation[] }>();

  const isEncrypted = c.req.header("X-Sync-Encrypted") === "true";
  const allowPlaintext = c.env.SYNC_ALLOW_PLAINTEXT === "true";

  if (!isEncrypted && !allowPlaintext) {
    return c.json({ error: "Encryption required. Missing X-Sync-Encrypted header." }, 400);
  }

  const dek = isEncrypted ? await getDekFromHeader(c, db, orgId, kekBase64) : null;

  if (isEncrypted && !dek) {
    return c.json({ error: "No valid DEK found for encrypted payload" }, 409);
  }

  const results: SyncPushResult[] = [];

  for (const op of body.operations) {
    const idempotencyKey = op.idempotencyKey;

    const existingIdempotency = await db
      .select()
      .from(schema.syncIdempotencyKeys)
      .where(eq(schema.syncIdempotencyKeys.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingIdempotency.length > 0) {
      const record = existingIdempotency[0];
      const cachedError = record.status === "error" && record.serverConfirmedRecord
        ? (record.serverConfirmedRecord as any).error
        : undefined;

      results.push({
        idempotencyKey,
        status: record.status,
        serverConfirmedRecord: record.status === "success"
          ? (record.serverConfirmedRecord as any) || undefined
          : undefined,
        error: cachedError,
      });
      continue;
    }

    let processedPayload = op.payload;
    if (isEncrypted && dek && op.payload?.envelope) {
      try {
        processedPayload = await decryptEnvelope(dek, op.payload.envelope);
      } catch (err) {
        console.error('[sync/push] envelope decrypt failed', {
          idempotencyKey: op.idempotencyKey,
          entityType: op.entityType,
          error: err instanceof Error ? err.message : String(err),
        });
        processedPayload = op.payload;
      }
    }

    const entityType = op.entityType;
    const entityId = op.entityId;
    const operation = op.operation;
    const localTimestamp = new Date(op.localTimestamp).toISOString();

    const tableSchema = tenantTables[entityType];
    if (!tableSchema) {
      const status = "error_unknown_entity";
      await db.insert(schema.syncIdempotencyKeys).values({
        idempotencyKey,
        orgId,
        entityType,
        entityId,
        status,
        serverConfirmedRecord: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      results.push({
        idempotencyKey,
        status,
        error: `Unknown or unsupported entity type: ${entityType}`,
      });
      continue;
    }

    try {
      const now = new Date().toISOString();

      if (operation === "delete" || (processedPayload as any).deletedAt) {
        const deletedAt = processedPayload.deletedAt
          ? (typeof processedPayload.deletedAt === "number"
            ? new Date(processedPayload.deletedAt).toISOString()
            : processedPayload.deletedAt)
          : localTimestamp;

        await db
          .update(tableSchema)
          .set({ deletedAt, updatedAt: deletedAt })
          .where(and(eq(tableSchema.id, entityId), eq(tableSchema.orgId, orgId)));

        const serverConfirmedRecord = {
          ...processedPayload,
          id: entityId,
          orgId,
          updatedAt: deletedAt,
          deletedAt,
        };

        await db.insert(schema.syncIdempotencyKeys).values({
          idempotencyKey,
          orgId,
          entityType,
          entityId,
          status: "success",
          serverConfirmedRecord,
          createdAt: now,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        results.push({
          idempotencyKey,
          status: "success",
          serverConfirmedRecord,
        });
      } else {
        const existing = await db
          .select()
          .from(tableSchema)
          .where(and(eq(tableSchema.id, entityId), eq(tableSchema.orgId, orgId)));

        const sanitizedData: Record<string, any> = {};
        for (const [key, value] of Object.entries(processedPayload)) {
          if (key === "id" || key === "orgId" || key === "org_id" || key === "deletedAt" || key === "updatedAt") continue;
          const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          sanitizedData[camelKey] = value;
        }

        if (existing.length > 0) {
          const existingUpdatedAt = new Date(existing[0].updatedAt).getTime();
          const incomingUpdatedAt = new Date(localTimestamp).getTime();

          if (incomingUpdatedAt > existingUpdatedAt) {
            if (entityType === "monthlySubscriptions") {
              const sid = processedPayload.studentId || processedPayload.student_id;
              const cid = processedPayload.courseId || processedPayload.course_id;
              if (sid && cid) {
                const [student] = await db
                  .select({
                    discountType: schema.students.discountType,
                    discountValue: schema.students.discountValue,
                  })
                  .from(schema.students)
                  .where(and(eq(schema.students.id, sid), eq(schema.students.orgId, orgId)))
                  .limit(1);

                const [course] = await db
                  .select({ price: schema.courses.price })
                  .from(schema.courses)
                  .where(and(eq(schema.courses.id, cid), eq(schema.courses.orgId, orgId)))
                  .limit(1);

                const basePrice = Number(course?.price || 0);
                let amount = basePrice;
                if (student?.discountType === "percentage" && student?.discountValue > 0) {
                  amount = Math.round(basePrice * (1 - student.discountValue / 100));
                } else if (student?.discountType === "fixed" && student?.discountValue > 0) {
                  amount = Math.max(0, basePrice - student.discountValue);
                }
                sanitizedData.amount = amount;
              }
            }

            await db
              .update(tableSchema)
              .set({ ...sanitizedData, updatedAt: localTimestamp })
              .where(and(eq(tableSchema.id, entityId), eq(tableSchema.orgId, orgId)));

            const [updatedRecord] = await db
              .select()
              .from(tableSchema)
              .where(and(eq(tableSchema.id, entityId), eq(tableSchema.orgId, orgId)))
              .limit(1);

            await db.insert(schema.syncIdempotencyKeys).values({
              idempotencyKey,
              orgId,
              entityType,
              entityId,
              status: "success",
              serverConfirmedRecord: updatedRecord,
              createdAt: now,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });

            results.push({
              idempotencyKey,
              status: "success",
              serverConfirmedRecord: updatedRecord,
            });
          } else {
            const serverConfirmedRecord = existing[0];
            await db.insert(schema.syncIdempotencyKeys).values({
              idempotencyKey,
              orgId,
              entityType,
              entityId,
              status: "ignored",
              serverConfirmedRecord: existing[0],
              createdAt: now,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });

            results.push({
              idempotencyKey,
              status: "ignored",
              serverConfirmedRecord,
            });
          }
        } else {
          if (entityType === "monthlySubscriptions") {
            const sid = processedPayload.studentId || processedPayload.student_id;
            const cid = processedPayload.courseId || processedPayload.course_id;
            if (sid && cid) {
              const [student] = await db
                .select({
                  discountType: schema.students.discountType,
                  discountValue: schema.students.discountValue,
                })
                .from(schema.students)
                .where(and(eq(schema.students.id, sid), eq(schema.students.orgId, orgId)))
                .limit(1);

              const [course] = await db
                .select({ price: schema.courses.price })
                .from(schema.courses)
                .where(and(eq(schema.courses.id, cid), eq(schema.courses.orgId, orgId)))
                .limit(1);

              const basePrice = Number(course?.price || 0);
              let amount = basePrice;
              if (student?.discountType === "percentage" && student?.discountValue > 0) {
                amount = Math.round(basePrice * (1 - student.discountValue / 100));
              } else if (student?.discountType === "fixed" && student?.discountValue > 0) {
                amount = Math.max(0, basePrice - student.discountValue);
              }
              sanitizedData.amount = amount;
            }
          }

          const insertValues: Record<string, any> = {
            ...sanitizedData,
            id: entityId,
            orgId,
            updatedAt: localTimestamp,
            createdAt: processedPayload.createdAt || localTimestamp,
          };

          if ("deletedAt" in processedPayload) {
            insertValues.deletedAt = processedPayload.deletedAt;
          }

          await db.insert(tableSchema).values(insertValues);

          const [newRecord] = await db
            .select()
            .from(tableSchema)
            .where(and(eq(tableSchema.id, entityId), eq(tableSchema.orgId, orgId)))
            .limit(1);

          await db.insert(schema.syncIdempotencyKeys).values({
            idempotencyKey,
            orgId,
            entityType,
            entityId,
            status: "success",
            serverConfirmedRecord: newRecord,
            createdAt: now,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

          results.push({
            idempotencyKey,
            status: "success",
            serverConfirmedRecord: newRecord,
          });
        }
      }
    } catch (err: any) {
      await db.insert(schema.syncIdempotencyKeys).values({
        idempotencyKey,
        orgId,
        entityType,
        entityId,
        status: "error",
        serverConfirmedRecord: { error: err?.message ?? String(err) },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      console.error("[sync/push] rejection", {
        idempotencyKey: op.idempotencyKey,
        entityType: op.entityType,
        entityId: op.entityId,
        operation: op.operation,
        payloadKeys: Object.keys(op.payload ?? {}),
        hasEnvelope: !!op.payload?.envelope,
        envelopeShape: op.payload?.envelope ? Object.keys(op.payload.envelope) : null,
        envelopeVersion: op.payload?.envelope?.v,
        ivLength: op.payload?.envelope?.iv?.length,
        ctLength: op.payload?.envelope?.ct?.length,
        errorMessage: err?.message,
        errorName: err?.name,
        errorStack: err?.stack,
      });

      results.push({
        idempotencyKey,
        status: "error",
        serverConfirmedRecord: undefined,
        error: err?.message ?? String(err),
      });
    }
  }

  const response: SyncPushResponse = { results };
  if (isEncrypted && dek) {
    const encryptedResponse = await encryptPayload(dek, response);
    return c.json({ encrypted: encryptedResponse });
  }

  return c.json(response);
});

app.get("/pull", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const kekBase64 = c.env.KEK as string;
  const since = c.req.query("since");

  if (!since) {
    return c.json({ error: "Missing 'since' query parameter" }, 400);
  }

  const isEncrypted = c.req.header("X-Sync-Encrypted") === "true";
  const allowPlaintext = c.env.SYNC_ALLOW_PLAINTEXT === "true";

  if (!isEncrypted && !allowPlaintext) {
    return c.json({ error: "Encryption required. Missing X-Sync-Encrypted header." }, 400);
  }

  const dek = isEncrypted ? await getDekFromHeader(c, db, orgId, kekBase64) : null;

  if (isEncrypted && !dek) {
    return c.json({ error: "No valid DEK found for encrypted payload" }, 409);
  }

  const sinceDate = new Date(since);
  const pullData: Record<string, any[]> = {};

  for (const [name, table] of Object.entries(tenantTables)) {
    try {
      const result = await db
        .select()
        .from(table)
        .where(
          and(
            eq(table.orgId, orgId),
            gte(table.updatedAt, sinceDate.toISOString())
          )
        );
      pullData[name] = result;
    } catch {
      pullData[name] = [];
    }
  }

  const response = {
    timestamp: new Date().toISOString(),
    data: pullData,
  };

  if (isEncrypted && dek) {
    const encryptedResponse = await encryptPayload(dek, response);
    return c.json({ encrypted: encryptedResponse });
  }

  return c.json(response);
});

interface SyncOperation {
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload?: any;
  encryptedPayload?: string;
  localTimestamp: string | number;
}

interface SyncPushResult {
  idempotencyKey: string;
  status: string;
  serverConfirmedRecord?: any;
  error?: string;
}

interface SyncPushResponse {
  results: SyncPushResult[];
}

export default app;
