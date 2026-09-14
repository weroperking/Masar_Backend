import { Hono } from "hono";
import { cors } from "hono/cors";
import pingDb from "./routes/ping-db";
import me from "./routes/me";
import students from "./routes/students";
import courses from "./routes/courses";
import sync from "./routes/sync";
import publicLookup from "./routes/public-lookup";
import webhooks from "./routes/webhooks";
import billing from "./routes/billing";
import orgs from "./routes/orgs";
import admin from "./routes/admin";
import { createAuthMiddleware } from "./middleware/auth";
import { createRequireActiveSubscription, createRequireFeature } from "./middleware/subscription";
import { createAdminMiddleware } from "./middleware/admin";
import { createCrudRouter } from "./lib/crud";
import { createDb, schema } from "./db";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const auth = createAuthMiddleware();
const requireActiveSubscription = createRequireActiveSubscription();
const requireInventorySalesFeature = createRequireFeature("inventory_sales");
const requireCombinedPackagesFeature = createRequireFeature("combined_packages");

app.get("/", (c) => {
  return c.json({ status: "ok" });
});

app.use("/api/*", cors({ origin: ["https://masar.top", "https://app.masar.top"] }));
app.use("/public/*", cors({ origin: ["https://masar.top", "https://app.masar.top"] }));

app.route("/public", publicLookup);
app.route("/api", pingDb);

// Webhooks — no auth, raw Clerk-signed payload
app.route("/webhooks", webhooks);

// /api/me — auth only, NO subscription gate (includes /subscription-status)
app.use("/api/me/*", auth);
app.route("/api/me", me);

// Billing — auth only, NO subscription gate (upgrade is callable even when expired)
app.use("/api/billing/*", auth);
app.route("/api/billing", billing);

// All other protected routes — auth + subscription gate
app.use("/api/students/*", auth, requireActiveSubscription);
app.use("/api/courses/*", auth, requireActiveSubscription);
app.use("/api/sync/*", auth, requireActiveSubscription);
app.use("/api/groups/*", auth, requireActiveSubscription);
app.use("/api/attendance-sessions/*", auth, requireActiveSubscription);
app.use("/api/attendance-records/*", auth, requireActiveSubscription);
app.use("/api/assessments/*", auth, requireActiveSubscription);
app.use("/api/assessment-grades/*", auth, requireActiveSubscription);
app.use("/api/products/*", auth, requireActiveSubscription);
app.use("/api/course-products/*", auth, requireActiveSubscription, requireCombinedPackagesFeature);
app.use("/api/session-payments/*", auth, requireActiveSubscription);
app.use("/api/revenue-entries/*", auth, requireActiveSubscription);
app.use("/api/expense-entries/*", auth, requireActiveSubscription);
app.use("/api/refund-entries/*", auth, requireActiveSubscription);
app.use("/api/booking-requests/*", auth, requireActiveSubscription);
app.use("/api/product-sales/*", auth, requireActiveSubscription, requireInventorySalesFeature);
app.use("/api/events/*", auth, requireActiveSubscription);
app.use("/api/users/*", auth, requireActiveSubscription);
app.use("/api/message-templates/*", auth, requireActiveSubscription);
app.use("/api/settings/*", auth, requireActiveSubscription);
app.use("/api/qr-cards/*", auth, requireActiveSubscription);
app.use("/api/monthly-subscriptions/*", auth, requireActiveSubscription);
app.use("/api/enrollments/*", auth, requireActiveSubscription);

app.route("/api/students", students);
app.route("/api/courses", courses);
app.route("/api/sync", sync);

app.route("/api/groups", createCrudRouter("groups", "group", schema.groups, {
  numericLimit: { limitKey: "max_branches", countColumn: schema.groups.id },
}));
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

// Tenant-facing org upgrade proposal routes (auth + active subscription required)
app.use("/api/orgs/*", auth, requireActiveSubscription);
app.route("/api/orgs", orgs);

// Admin routes (protected by shared secret header, no Clerk auth)
app.use("/admin/*", createAdminMiddleware());
app.route("/admin", admin);

export default app;
