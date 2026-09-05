import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  return c.json({ userId, orgId });
});

export default app;
