import { Router } from "express";
import * as c from "../controllers/preventiveController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole("ADMINISTRATOR");
const engineer = requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR");

// Everyone signed in reads plans — department scoping is applied in the controller.
router.get("/", c.listPlans);
router.get("/stats", c.planStats);
router.get("/schedule", c.planSchedule);
router.get("/:id", c.getPlan);
router.get("/:id/checklist", c.planChecklist);
router.get("/:id/history", c.planHistory);

router.post("/", admin, c.createPlan);
router.put("/:id", admin, c.updatePlan);
router.patch("/:id/status", admin, c.setPlanStatus);
router.patch("/:id/assign", admin, c.assignPlan);
router.delete("/:id", admin, c.deletePlan);

// Engineers execute the visit and record checklist results.
router.post("/:id/complete", engineer, c.completePlan);

export default router;
