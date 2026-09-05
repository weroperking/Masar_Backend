import { Context, MiddlewareHandler } from "hono";
import { createClerkAuth, extractToken } from "../lib/clerk";

export interface AuthContext {
  userId: string;
  orgId: string;
}

export function createAuthMiddleware() {
  const verifyToken = createClerkAuth({ CLERK_SECRET_KEY: "" });

  return (async (c: Context, next: () => Promise<void>) => {
    const secretKey = c.env.CLERK_SECRET_KEY as string | undefined;
    if (!secretKey) {
      return c.json({ error: "CLERK_SECRET_KEY not configured" }, 500);
    }

    const token = extractToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    try {
      const verify = createClerkAuth({ CLERK_SECRET_KEY: secretKey });
      const { userId, orgId } = await verify(token);

      if (!orgId) {
        return c.json({ error: "No active organization" }, 401);
      }

      c.set("userId", userId);
      c.set("orgId", orgId);
      await next();
    } catch (err) {
      return c.json({ error: "Invalid session token" }, 401);
    }
  }) as MiddlewareHandler;
}
