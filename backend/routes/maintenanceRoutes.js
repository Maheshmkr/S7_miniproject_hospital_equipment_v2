import { Router } from "express";
import * as c from "../controllers/maintenanceController.js";
import { maintenanceAudit } from "../controllers/auditController.js";
import { createServiceReport } from "../controllers/maintenanceController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { upload } from "../services/uploadService.js";

const router = Router();
router.use(requireAuth);

const engineer = requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR");

router.get("/", c.listMaintenance);
router.get("/stats", c.maintenanceStats);
router.post("/", engineer, c.createMaintenance);
router.get("/:id", c.getMaintenance);
router.get("/:id/transitions", c.maintenanceTransitions);
router.patch("/:id/status", engineer, c.setMaintenanceStatus);
router.patch("/:id/assign", requireRole("ADMINISTRATOR"), c.assignMaintenance);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteMaintenance);
router.get("/:id/history", c.maintenanceHistory);
router.get("/:maintenanceId/audit", maintenanceAudit);
router.get("/:id/checklist", c.getChecklist);
router.get("/:id/investigation", c.getInvestigation);
router.get("/:id/evidence", c.listEvidence);

router.put("/:id", engineer, c.updateMaintenance);
router.post("/:id/checklist", engineer, c.submitChecklist);
router.post("/:id/investigation", engineer, c.upsertInvestigation);
router.put("/:id/investigation", engineer, c.upsertInvestigation);
router.post("/:id/evidence", engineer, upload.array("files"), c.addEvidence);
router.post("/:id/service-report", engineer, createServiceReport);
router.post("/:id/complete", engineer, c.completeMaintenance);

export default router;
