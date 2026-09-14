import type { Context, MiddlewareHandler } from "hono";

export function createAdminMiddleware() {
  return (async (c: Context, next: () => Promise<void>) => {
    const adminSecret = c.env.ADMIN_SECRET as string | undefined;
    if (!adminSecret) {
      return c.json({ error: "Admin secret not configured" }, 500);
    }

    const providedSecret = c.req.header("X-Admin-Secret");
    if (providedSecret !== adminSecret) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  }) as MiddlewareHandler;
}
