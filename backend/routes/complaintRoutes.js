import { Router } from "express";
import * as c from "../controllers/complaintController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listComplaints);
router.get("/:id", c.getComplaint);
router.get("/:id/history", c.complaintHistory);
router.get("/:id/transitions", c.complaintTransitions);
router.post("/", requireRole("DEPARTMENT_STAFF", "ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.createComplaint);
router.post("/:id/messages", c.addComplaintMessage);
router.put("/:id", requireRole("ADMINISTRATOR", "DEPARTMENT_STAFF", "BIOMEDICAL_ENGINEER"), c.updateComplaint);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteComplaint);
router.patch("/:id/status", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.updateComplaintStatus);
router.patch("/:id/assign", requireRole("ADMINISTRATOR"), c.assignComplaint);
export default router;
