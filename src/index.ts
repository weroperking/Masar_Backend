import { Hono } from "hono";
import pingDb from "./routes/ping-db";
import me from "./routes/me";
import students from "./routes/students";
import courses from "./routes/courses";
import { createAuthMiddleware } from "./middleware/auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const auth = createAuthMiddleware();

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", pingDb);
app.route("/api/me", me);

app.use("/api/students/*", auth);
app.use("/api/courses/*", auth);
app.route("/api/students", students);
app.route("/api/courses", courses);

export default app;
