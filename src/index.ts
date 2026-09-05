import { Hono } from "hono";
import pingDb from "./routes/ping-db";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", pingDb);

export default app;
