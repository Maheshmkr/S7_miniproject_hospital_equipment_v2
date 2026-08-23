import { Router } from "express";
import * as c from "../controllers/workOrderController.js";
import { workOrderAudit } from "../controllers/auditController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listWorkOrders);
router.get("/:id", c.getWorkOrder);
router.get("/:id/history", c.workOrderHistory);
router.get("/:id/transitions", c.workOrderTransitions);
router.get("/:workOrderId/audit", workOrderAudit);
router.post("/", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.createWorkOrder);
router.post("/:id/start", requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR"), c.startWorkOrder);
router.put("/:id", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.updateWorkOrder);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteWorkOrder);
router.patch("/:id/assign", requireRole("ADMINISTRATOR"), c.assignWorkOrder);
router.patch("/:id/status", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.updateWorkOrderStatus);
export default router;

/** Engineer-scoped routes mounted at /api/engineers */
export const engineerRouter = Router();
engineerRouter.use(requireAuth);
engineerRouter.get("/me/work-orders", requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR"), c.myWorkOrders);
