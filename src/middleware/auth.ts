import { Context, MiddlewareHandler } from "hono";
import { createClerkClient } from "@clerk/backend";

export interface AuthContext {
  userId: string;
  orgId: string;
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
      const clerkClient = createClerkClient({ secretKey });

      const requestState = await clerkClient.authenticateRequest(c.req.raw, {
        acceptsToken: "session_token",
      });

      const auth = requestState.toAuth();

      if (!auth.isAuthenticated || !auth.userId) {
        return c.json({ error: "Invalid session token" }, 401);
      }

      if (!auth.orgId) {
        return c.json({ error: "No active organization" }, 401);
      }

      c.set("userId", auth.userId);
      c.set("orgId", auth.orgId);
      await next();
    } catch (err) {
      return c.json({ error: "Invalid session token" }, 401);
    }
  }) as MiddlewareHandler;
}
