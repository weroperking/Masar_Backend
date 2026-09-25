import type { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { AppEnv } from "../types";

export interface AuthContext {
  userId: string;
  orgId: string;
}

export interface VerifiedClerkToken {
  userId: string;
  orgId: string | null;
}

/**
 * JWKS is fetched per issuer and cached briefly. A kid miss always refetches,
 * so a Clerk key rotation cannot lock anyone out for longer than one request.
 */
const JWKS_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map<string, { keys: any[]; fetchedAt: number }>();

async function fetchClerkJwks(issuer: string): Promise<any[]> {
  const res = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  const jwks = (await res.json()) as { keys: (JsonWebKey & { kid?: string })[] };
  return jwks.keys ?? [];
}

async function getClerkJwks(issuer: string, forceRefresh = false): Promise<any[]> {
  const cached = jwksCache.get(issuer);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }
  const keys = await fetchClerkJwks(issuer);
  jwksCache.set(issuer, { keys, fetchedAt: Date.now() });
  return keys;
}

/**
 * Verifies a Clerk session JWT and returns its user/org claims.
 * Returns null (never throws) for anything that is not a valid, current token.
 */
export async function verifyClerkToken(token: string): Promise<VerifiedClerkToken | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Unverified decode, used only to discover the issuer and kid for JWKS lookup.
    const header = JSON.parse(Buffer.from(parts[0], "base64").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    const issuer = payload.iss;
    if (!issuer || typeof issuer !== "string" || !header.kid) {
      return null;
    }

    let jwks = await getClerkJwks(issuer);
    let jwk = jwks.find((k: any) => k.kid === header.kid);
    if (!jwk) {
      jwks = await getClerkJwks(issuer, true);
      jwk = jwks.find((k: any) => k.kid === header.kid);
    }
    if (!jwk) {
      return null;
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const { payload: verifiedPayload } = await jwtVerify(token, key);
    const userId = verifiedPayload.sub;
    if (!userId) {
      return null;
    }

    return {
      userId,
      orgId: (verifiedPayload.o as any)?.id ?? null,
    };
  } catch {
    return null;
  }
}

export function createAuthMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const secretKey = c.env.CLERK_SECRET_KEY as string | undefined;
    if (!secretKey) {
      return c.json({ error: "CLERK_SECRET_KEY not configured" }, 500);
    }

    const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
    if (!token) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    const verified = await verifyClerkToken(token);
    if (!verified) {
      return c.json({ error: "Invalid session token" }, 401);
    }

    if (!verified.orgId) {
      return c.json({ error: "No active organization" }, 401);
    }

    c.set("userId", verified.userId);
    c.set("orgId", verified.orgId);
    await next();
    return;
  };
}
