require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const prisma = require("./db");
const seed = require("./seed");
const logger = require("./lib/logger");

// Middleware
const auth = require("./middleware/auth");
const { tenantScope, loadUser } = require("./middleware/tenantScope");
const requirePlan = require("./middleware/requirePlan");
const { apiLimiter, authLimiter, uploadLimiter } = require("./middleware/rateLimit");
const { errorHandler } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const uploadsRoutes = require("./routes/uploads");
const suppliersRoutes = require("./routes/suppliers");
const movementsRoutes = require("./routes/movements");
const searchRoutes = require("./routes/search");
const clientsRoutes = require("./routes/clients");
const invoicesRoutes = require("./routes/invoices");
const quotesRoutes = require("./routes/quotes");
const deliveryNotesRoutes = require("./routes/deliveryNotes");
const clientRequestsRoutes = require("./routes/clientRequests");
const creancesRoutes = require("./routes/creances");
const boutiqueRoutes = require("./routes/boutique");
const storefrontRoutes = require("./routes/storefront");
const shopSettingsRoutes = require("./routes/shopSettings");
const maintenanceRoutes = require("./routes/maintenance");
const dailyPurchasesRoutes = require("./routes/dailyPurchases");
const employeesRoutes = require("./routes/employees");
const salariesRoutes = require("./routes/salaries");
const purchaseOrdersRoutes = require("./routes/purchaseOrders");
const analyticsRoutes = require("./routes/analytics");
const bankAccountsRoutes = require("./routes/bankAccounts");
const bankTransactionsRoutes = require("./routes/bankTransactions");
const companySettingsRoutes = require("./routes/companySettings");
const trashRoutes = require("./routes/trash");
const onboardingRoutes = require("./routes/onboarding");
const commerceSettingsRoutes = require("./routes/commerceSettings");
const tasksRoutes = require("./routes/tasks");
const stripeRoutes = require("./routes/stripe");
const socialAuthRoutes = require("./routes/social-auth");
const teamRoutes = require("./routes/team");
const paydunyaRoutes = require("./routes/paydunya");
const caisseRoutes = require("./routes/caisse");
const notificationsRoutes = require("./routes/notifications");
const bulkRoutes = require("./routes/bulk");
const exportRoutes = require("./routes/export");
const whatsappRoutes = require("./routes/whatsapp");
const leavesRoutes = require("./routes/leaves");
const attendanceRoutes = require("./routes/attendance");
const recurringInvoicesRoutes = require("./routes/recurringInvoices");
const supplierRatingsRoutes = require("./routes/supplierRatings");
const importExportRoutes = require("./routes/importExport");
const arrivagesRoutes = require("./routes/arrivages");
const productLabelsRoutes = require("./routes/productLabels");
const exchangeItemsRoutes = require("./routes/exchangeItems");
const draftsRoutes = require("./routes/drafts");
const backupRoutes = require("./routes/backup");
const printRoutes = require("./routes/print");
const superAdminRoutes = require("./routes/superAdmin");
const { startCronJobs } = require("./lib/cron");

const http = require("http");
const { initSocket } = require("./lib/socket");

const app = express();
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

// ═══ Security middleware ═══
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images from /uploads
  contentSecurityPolicy: false, // Let frontend handle CSP
}));

// CORS — restrict to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow local network origins (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("CORS non autorise"));
  },
  credentials: true,
}));

// Global rate limiter
app.use("/api/", apiLimiter);

// Stripe webhook must receive raw body BEFORE express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeRoutes.handleWebhook);

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

// ═══ Shorthand: auth + tenant scope ═══
const secured = [auth, loadUser, tenantScope];
const pro = [auth, loadUser, tenantScope, requirePlan(["premium", "entreprise"])];

// ═══ Public routes (no auth) ═══
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/auth/social", authLimiter, socialAuthRoutes);
app.use("/api/shop", storefrontRoutes);
app.use("/api/shop/settings", shopSettingsRoutes.public);
app.use("/api/paydunya", paydunyaRoutes);

// WhatsApp webhook (no auth — called by Evolution API)
app.post("/api/whatsapp/webhook", express.json(), (req, res) => {
  const { setQrCode } = require("./lib/whatsapp");
  const body = req.body;
  const event = body.event;
  const instance = body.instance;
  if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
    const qr = body.data?.qrcode?.base64 || body.data?.base64;
    if (qr && instance) setQrCode(instance, qr);
  }
  if ((event === "connection.update" || event === "CONNECTION_UPDATE") && body.data?.state === "open") {
    prisma.companySettings.updateMany({ where: { whatsappInstanceName: instance }, data: { whatsappConnected: true } }).catch(() => {});
  }
  res.json({ received: true });
});

// ═══ Protected routes (auth + tenant) ═══
app.use("/api/stripe", auth, stripeRoutes.router);
app.use("/api/categories", ...secured, categoriesRoutes);
app.use("/api/products", ...secured, productsRoutes);
app.use("/api/uploads", auth, uploadLimiter, uploadsRoutes);
app.use("/api/suppliers", ...secured, suppliersRoutes);
app.use("/api/movements", ...secured, movementsRoutes);
app.use("/api/search", ...secured, searchRoutes);
app.use("/api/clients", ...secured, clientsRoutes);
app.use("/api/invoices", ...secured, invoicesRoutes);
app.use("/api/quotes", ...secured, quotesRoutes);
app.use("/api/delivery-notes", ...secured, deliveryNotesRoutes);
app.use("/api/client-requests", ...secured, clientRequestsRoutes);
app.use("/api/creances", ...secured, creancesRoutes);
app.use("/api/maintenance", ...secured, maintenanceRoutes);
app.use("/api/daily-purchases", ...secured, dailyPurchasesRoutes);
app.use("/api/company-settings", ...secured, companySettingsRoutes);
app.use("/api/commerce-settings", ...secured, commerceSettingsRoutes);
app.use("/api/team", ...secured, teamRoutes);
app.use("/api/trash", ...secured, trashRoutes);
app.use("/api/onboarding", ...secured, onboardingRoutes);
app.use("/api/caisse", ...secured, caisseRoutes);
app.use("/api/notifications", ...secured, notificationsRoutes);
app.use("/api/bulk", ...secured, bulkRoutes);
app.use("/api/export", ...secured, exportRoutes);
app.use("/api/whatsapp", ...secured, whatsappRoutes);
app.use("/api/import-export", ...secured, importExportRoutes);
app.use("/api/recurring-invoices", ...secured, recurringInvoicesRoutes);
app.use("/api/supplier-ratings", ...secured, supplierRatingsRoutes);

// ═══ Premium/Enterprise routes ═══
app.use("/api/boutique", ...pro, boutiqueRoutes);
app.use("/api/boutique/settings", ...pro, shopSettingsRoutes.admin);
app.use("/api/employees", ...pro, employeesRoutes);
app.use("/api/salaries", ...pro, salariesRoutes);
app.use("/api/leaves", ...pro, leavesRoutes);
app.use("/api/attendance", ...pro, attendanceRoutes);
app.use("/api/purchase-orders", ...pro, purchaseOrdersRoutes);
app.use("/api/arrivages", ...secured, arrivagesRoutes);
app.use("/api/product-labels", ...secured, productLabelsRoutes);
app.use("/api/exchange-items", ...secured, exchangeItemsRoutes);
app.use("/api/drafts", ...secured, draftsRoutes);
app.use("/api/backup", ...secured, backupRoutes);
app.use("/api/print", ...secured, printRoutes);
app.use("/api/analytics", ...pro, analyticsRoutes);
app.use("/api/bank-accounts", ...pro, bankAccountsRoutes);
app.use("/api/bank-transactions", ...pro, bankTransactionsRoutes);
app.use("/api/tasks", ...pro, tasksRoutes);

// ═══ Super Admin ═══
app.use("/api/super-admin", auth, loadUser, superAdminRoutes);

// ═══ Health check ═══
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ═══ Error handler (must be last) ═══
app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    logger.info("Connected to PostgreSQL");
    await seed();
    startCronJobs();
    server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error("Database connection error:", err);
    process.exit(1);
  }
}

start();
