import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import { verifyClerkToken } from "./auth";

/**
 * Same Clerk verification as createAuthMiddleware(), but never rejects.
 *
 * For routes that are reachable both with and without a session (the public
 * student-card endpoints): when a valid bearer token is present its org claim is
 * authoritative, otherwise the route falls back to capability proof (a
 * student lookup_code) or 401s on its own terms.
 */
export function createOptionalAuthMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
    if (token && c.env.CLERK_SECRET_KEY) {
      const verified = await verifyClerkToken(token);
      if (verified) {
        c.set("userId", verified.userId);
        if (verified.orgId) {
          c.set("orgId", verified.orgId);
        }
      }
    }
    await next();
  };
}
