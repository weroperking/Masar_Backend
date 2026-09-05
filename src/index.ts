import { Hono } from "hono";
import pingDb from "./routes/ping-db";
import me from "./routes/me";
import students from "./routes/students";
import courses from "./routes/courses";
import sync from "./routes/sync";
import { createCrudRoutes } from "./routes/crud";
import { createAuthMiddleware } from "./middleware/auth";
import { type TableName } from "./db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const auth = createAuthMiddleware();

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", pingDb);
app.use("/api/me/*", auth);
app.route("/api/me", me);

const crudTables: TableName[] = [
  "groups",
  "attendanceSessions",
  "attendanceRecords",
  "assessments",
  "assessmentGrades",
  "sessionPayments",
  "ledgerEntries",
  "bookingRequests",
  "products",
  "courseProducts",
  "productSales",
  "events",
  "users",
  "messageTemplates",
  "settings",
  "qrCards",
  "monthlySubscriptions",
  "payments",
];

for (const tableName of crudTables) {
  const route = tableName.replace(/([A-Z])/g, "_$1").toLowerCase();
  app.use(`/api/${route}/*`, auth);
  app.route(`/api/${route}`, createCrudRoutes(tableName));
}

app.use("/api/students/*", auth);
app.use("/api/courses/*", auth);
app.use("/api/sync/*", auth);
app.route("/api/students", students);
app.route("/api/courses", courses);
app.route("/api/sync", sync);

export default app;
