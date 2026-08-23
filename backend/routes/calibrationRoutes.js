import { Router } from "express";
import * as c from "../controllers/calibrationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole("ADMINISTRATOR");
const engineer = requireRole("BIOMEDICAL_ENGINEER", "ADMINISTRATOR");

// Everyone signed in reads calibration — department scoping applied in the controller.
router.get("/", c.listCalibrations);
router.get("/stats", c.calibrationStats);
router.get("/schedule", c.calibrationSchedule);
router.get("/:id", c.getCalibration);
router.get("/:id/checklist", c.calibrationChecklist);
router.get("/:id/history", c.calibrationHistory);

router.post("/", admin, c.createCalibration);
router.put("/:id", engineer, c.updateCalibration);
router.patch("/:id/status", engineer, c.setCalibrationStatus);
router.patch("/:id/assign", admin, c.assignCalibration);
router.delete("/:id", admin, c.deleteCalibration);

// Engineers perform the calibration and record the result.
router.post("/:id/complete", engineer, c.completeCalibration);

export default router;
