import { Hono } from "hono";
import { neon } from "@neondatabase/serverless";

const app = new Hono();

app.get("/ping-db", async (c) => {
  const databaseUrl = c.env.DATABASE_URL as string | undefined;
  if (!databaseUrl) {
    return c.json({ error: "DATABASE_URL not configured" }, 500);
  }
  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT 1 as test`;
    return c.json({ db: "connected", result });
  } catch (err) {
    return c.json({ db: "error", error: String(err) }, 500);
  }
});

export default app;
