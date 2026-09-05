import { Hono } from "hono";
import { createAuthMiddleware } from "../middleware/auth";

const app = new Hono();
const auth = createAuthMiddleware();

app.use("/*", auth);

app.get("/me", (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  return c.json({ userId, orgId });
});

export default app;
