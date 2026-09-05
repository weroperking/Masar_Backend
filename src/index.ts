import { Hono } from "hono";
import pingDb from "./routes/ping-db";
import me from "./routes/me";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", pingDb);
app.route("/api", me);

export default app;
