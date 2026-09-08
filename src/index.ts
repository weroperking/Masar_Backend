import { Hono } from "hono";
import { cors } from "hono/cors";
import pingDb from "./routes/ping-db";
import me from "./routes/me";
import students from "./routes/students";
import courses from "./routes/courses";
import sync from "./routes/sync";
import { createAuthMiddleware } from "./middleware/auth";
import { createCrudRouter } from "./lib/crud";
import { createDb, schema } from "./db";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const auth = createAuthMiddleware();

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.use("/api/*", cors({ origin: "*" })); // TODO: restrict to fixed production frontend origin before going live to real users

app.route("/api", pingDb);
app.use("/api/me/*", auth);
app.route("/api/me", me);

app.use("/api/students/*", auth);
app.use("/api/courses/*", auth);
app.use("/api/sync/*", auth);
app.use("/api/groups/*", auth);
app.use("/api/attendance-sessions/*", auth);
app.use("/api/attendance-records/*", auth);
app.use("/api/assessments/*", auth);
app.use("/api/assessment-grades/*", auth);
app.use("/api/products/*", auth);
app.use("/api/course-products/*", auth);
app.use("/api/session-payments/*", auth);
app.use("/api/revenue-entries/*", auth);
app.use("/api/expense-entries/*", auth);
app.use("/api/refund-entries/*", auth);
app.use("/api/booking-requests/*", auth);
app.use("/api/product-sales/*", auth);
app.use("/api/events/*", auth);
app.use("/api/users/*", auth);
app.use("/api/message-templates/*", auth);
app.use("/api/settings/*", auth);
app.use("/api/qr-cards/*", auth);
app.use("/api/monthly-subscriptions/*", auth);
app.use("/api/enrollments/*", auth);

app.route("/api/students", students);
app.route("/api/courses", courses);
app.route("/api/sync", sync);

app.route("/api/groups", createCrudRouter("groups", "group", schema.groups));
app.route("/api/attendance-sessions", createCrudRouter("attendanceSessions", "attendanceSession", schema.attendanceSessions));
app.route("/api/attendance-records", createCrudRouter("attendanceRecords", "attendanceRecord", schema.attendanceRecords));
app.route("/api/assessments", createCrudRouter("assessments", "assessment", schema.assessments));
app.route("/api/assessment-grades", createCrudRouter("assessmentGrades", "assessmentGrade", schema.assessmentGrades));
app.route("/api/products", createCrudRouter("products", "product", schema.products));
app.route("/api/course-products", createCrudRouter("courseProducts", "courseProduct", schema.courseProducts));
app.route("/api/session-payments", createCrudRouter("sessionPayments", "sessionPayment", schema.sessionPayments));
app.route("/api/revenue-entries", createCrudRouter("revenueEntries", "revenueEntry", schema.revenueEntries));
app.route("/api/expense-entries", createCrudRouter("expenseEntries", "expenseEntry", schema.expenseEntries));
app.route("/api/refund-entries", createCrudRouter("refundEntries", "refundEntry", schema.refundEntries));
app.route("/api/booking-requests", createCrudRouter("bookingRequests", "bookingRequest", schema.bookingRequests));
app.route("/api/product-sales", createCrudRouter("productSales", "productSale", schema.productSales));
app.route("/api/events", createCrudRouter("events", "event", schema.events));
app.route("/api/users", createCrudRouter("users", "user", schema.users));
app.route("/api/message-templates", createCrudRouter("messageTemplates", "messageTemplate", schema.messageTemplates));
app.route("/api/settings", createCrudRouter("settings", "setting", schema.settings));
app.route("/api/qr-cards", createCrudRouter("qrCards", "qrCard", schema.qrCards));
app.route("/api/monthly-subscriptions", createCrudRouter("monthlySubscriptions", "monthlySubscription", schema.monthlySubscriptions));
app.route("/api/enrollments", createCrudRouter("enrollments", "enrollment", schema.enrollments));

export default app;
