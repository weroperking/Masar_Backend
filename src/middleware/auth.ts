import { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";

export interface AuthContext {
  userId: string;
  orgId: string;
}

const jwksCache: { keys: any[] } | null = null;

async function getClerkJwks(issuer: string) {
  const res = await fetch(`${issuer}/.well-known/jwks.json`);
  const jwks = await res.json();
  return jwks;
}

export function createAuthMiddleware() {
  return (async (c: Context, next: () => Promise<void>) => {
    const secretKey = c.env.CLERK_SECRET_KEY as string | undefined;
    if (!secretKey) {
      return c.json({ error: "CLERK_SECRET_KEY not configured" }, 500);
    }

    const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
    if (!token) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    try {
      // Decode header to get issuer (unverified, just for JWKS discovery)
      const parts = token.split(".");
      const header = JSON.parse(
        Buffer.from(parts[0], "base64").toString()
      );

      // Decode payload to get issuer (unverified, just for JWKS discovery)
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString()
      );

      const issuer = payload.iss;
      const jwks = await getClerkJwks(issuer);
      const jwk = jwks.keys.find((k: any) => k.kid === header.kid);

      if (!jwk) {
        throw new Error("JWK not found");
      }

      const key = await globalThis.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const { payload: verifiedPayload } = await jwtVerify(token, key);

      const userId = verifiedPayload.sub;
      const orgId = (verifiedPayload.o as any)?.id;

      if (!userId || !orgId) {
        return c.json({ error: "No active organization" }, 401);
      }

      c.set("userId", userId);
      c.set("orgId", orgId);
      await next();
    } catch (err: any) {
      return c.json({ error: "Invalid session token" }, 401);
    }
  }) as MiddlewareHandler;
}
