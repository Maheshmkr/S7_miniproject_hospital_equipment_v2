import { Router } from "express";
import * as c from "../controllers/serviceReportController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listServiceReports);
router.get("/:id", c.getServiceReport);
router.put("/:id", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.updateServiceReport);
export default router;
