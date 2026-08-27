import { Router } from "express";
import * as c from "../controllers/reportController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const staffAndUp = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER", "DEPARTMENT_STAFF");
const engineerAndUp = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER");

export const reportRouter = Router();
reportRouter.use(requireAuth, engineerAndUp);

/* Reports */
reportRouter.get("/equipment", c.equipmentReport);
reportRouter.get("/complaints", c.complaintReport);
reportRouter.get("/maintenance", c.maintenanceReport);
reportRouter.get("/departments", c.departmentReport);
reportRouter.get("/warranty", c.warrantyReport);
reportRouter.get("/audit", c.auditReport);
reportRouter.get("/inventory", c.inventoryReport);
reportRouter.get("/vendors", c.vendorReport);
reportRouter.get("/purchase-orders", c.purchaseOrderReport);
reportRouter.get("/calibration", c.calibrationReport);
reportRouter.get("/preventive-maintenance", c.preventiveReport);
reportRouter.get("/export/:module", c.exportModuleCsv);

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, staffAndUp);

/* Analytics */
analyticsRouter.get("/dashboard", c.dashboardAnalytics);
analyticsRouter.get("/equipment", c.equipmentAnalytics);
analyticsRouter.get("/complaints", c.complaintAnalytics);
analyticsRouter.get("/maintenance", c.maintenanceAnalytics);
analyticsRouter.get("/departments", c.departmentAnalytics);
analyticsRouter.get("/warranty", c.warrantyAnalytics);
analyticsRouter.get("/audit", c.auditAnalytics);
analyticsRouter.get("/audits", c.auditAnalytics);
analyticsRouter.get("/inventory", c.inventoryAnalytics);
analyticsRouter.get("/vendors", c.vendorAnalytics);
analyticsRouter.get("/purchase-orders", c.purchaseOrderAnalytics);

/* New Analytics Endpoints */
analyticsRouter.get("/work-orders", c.workOrderAnalytics);
analyticsRouter.get("/calibration", c.calibrationAnalytics);
analyticsRouter.get("/preventive-maintenance", c.preventiveAnalytics);
analyticsRouter.get("/trends", c.trendsAnalytics);
analyticsRouter.get("/distributions", c.distributionsAnalytics);
analyticsRouter.get("/comparative-performance", c.comparativePerformance);
analyticsRouter.get("/costs", c.costsAnalytics);
analyticsRouter.get("/compliance", c.complianceAnalytics);
analyticsRouter.get("/availability", c.availabilityAnalytics);
analyticsRouter.get("/breakdowns", c.breakdownsAnalytics);

export default reportRouter;
