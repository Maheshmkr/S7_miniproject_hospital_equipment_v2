import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB, dbStatus } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { uploadDir } from "./services/uploadService.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import equipmentRoutes from "./routes/equipmentRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import workOrderRoutes, { engineerRouter } from "./routes/workOrderRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import checklistRoutes from "./routes/checklistRoutes.js";
import preventiveRoutes from "./routes/preventiveRoutes.js";
import calibrationRoutes from "./routes/calibrationRoutes.js";
import serviceReportRoutes from "./routes/serviceReportRoutes.js";
import warrantyRoutes from "./routes/warrantyRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import auditRoutes, { auditLogRouter } from "./routes/auditRoutes.js";
import { analyticsRouter, reportRouter } from "./routes/reportRoutes.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    status: "ok",
    database: dbStatus(),
    message: "Hospital Asset Management API is running",
    data: { database: dbStatus() },
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/work-orders", workOrderRoutes);
app.use("/api/engineers", engineerRouter);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/preventive-maintenance", preventiveRoutes);
app.use("/api/calibration", calibrationRoutes);
app.use("/api/service-reports", serviceReportRoutes);
app.use("/api/warranties", warrantyRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/audit-logs", auditLogRouter);
app.use("/api/reports", reportRouter);
app.use("/api/analytics", analyticsRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`[api] listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("[api] failed to start — MongoDB connection error:", err.message);
    process.exit(1);
  });

export default app;
