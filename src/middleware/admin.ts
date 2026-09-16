import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

export function createAdminMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const adminSecret = c.env.ADMIN_SECRET as string | undefined;
    if (!adminSecret) {
      return c.json({ error: "Admin secret not configured" }, 500);
    }

    const providedSecret = c.req.header("X-Admin-Secret");
    if (providedSecret !== adminSecret) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}
