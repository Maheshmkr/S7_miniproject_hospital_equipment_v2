import { Router } from "express";
import * as c from "../controllers/auditController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

/** Immutable audit trail — administrators only. */
export const auditLogRouter = Router();
auditLogRouter.use(requireAuth, requireRole("ADMINISTRATOR"));
auditLogRouter.get("/", c.listAuditLogs);
auditLogRouter.get("/:id", c.getAuditLog);

/** Governance audits — administrators author, engineers respond. */
const router = Router();
router.use(requireAuth);
router.get("/templates", c.listAuditTemplates);
router.post("/templates", requireRole("ADMINISTRATOR"), c.createAuditTemplate);
router.put("/templates/:id", requireRole("ADMINISTRATOR"), c.updateAuditTemplate);
router.get("/", c.listAudits);
router.post("/assign", requireRole("ADMINISTRATOR"), c.assignAudit);
router.post("/:id/respond", requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR"), c.respondAudit);
router.post("/:id/review", requireRole("ADMINISTRATOR"), c.reviewAudit);
export default router;
