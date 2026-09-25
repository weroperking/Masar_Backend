import { eq, and } from "drizzle-orm";
import { createDb, schema } from "../db";

export const PARENT_FOLLOW_DOMAIN = "app.masar.top";
export const PARENT_FOLLOW_URL_PREFIX = `https://${PARENT_FOLLOW_DOMAIN}/p/s`;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function binaryToBase64Url(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBinary(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) {
    b64 += "=".repeat(4 - pad);
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateLookupPrefix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return binaryToBase64Url(bytes);
}

export function encodeLookupCode(orgPrefix: string, studentId: string): string {
  const payload = `${orgPrefix}:${studentId}`;
  return binaryToBase64Url(textEncoder.encode(payload));
}

export interface DecodedLookupCode {
  orgPrefix: string;
  studentId: string;
}

export function decodeLookupCode(code: string): DecodedLookupCode | null {
  try {
    if (typeof code !== "string" || code.length === 0) {
      return null;
    }
    let padded = code;
    const mod = padded.length % 4;
    if (mod === 1) {
      return null;
    }
    const binary = base64UrlToBinary(padded);
    const payload = textDecoder.decode(binary);
    const colonIndex = payload.indexOf(":");
    if (colonIndex <= 0) {
      return null;
    }
    const orgPrefix = payload.slice(0, colonIndex);
    const studentId = payload.slice(colonIndex + 1);
    if (orgPrefix.length === 0 || studentId.length === 0) {
      return null;
    }
    return { orgPrefix, studentId };
  } catch {
    return null;
  }
}

export async function getOrgLookupPrefix(
  db: ReturnType<typeof createDb>,
  orgId: string,
): Promise<string> {
  const [subscription] = await db
    .select({ lookupPrefix: schema.subscriptions.lookupPrefix })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, orgId))
    .limit(1);

  if (subscription?.lookupPrefix) {
    return subscription.lookupPrefix;
  }

  const prefix = generateLookupPrefix();
  await db
    .update(schema.subscriptions)
    .set({ lookupPrefix: prefix, updatedAt: new Date().toISOString() })
    .where(eq(schema.subscriptions.orgId, orgId));
  return prefix;
}

export async function issueStudentLookupCode(
  db: ReturnType<typeof createDb>,
  orgId: string,
  studentId: string,
): Promise<string> {
  const prefix = await getOrgLookupPrefix(db, orgId);
  const lookupCode = encodeLookupCode(prefix, studentId);
  await db
    .update(schema.students)
    .set({ lookupCode, updatedAt: new Date().toISOString() })
    .where(
      and(eq(schema.students.id, studentId), eq(schema.students.orgId, orgId)),
    );
  return lookupCode;
}
