import { Router } from "express";
import * as c from "../controllers/departmentController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listDepartments);
router.get("/:id", c.getDepartment);
router.get("/:id/staff", c.departmentStaff);
router.get("/:id/equipment", c.departmentEquipment);
router.get("/:id/complaints", c.departmentComplaints);
router.get("/:id/maintenance", c.departmentMaintenance);
router.post("/", requireRole("ADMINISTRATOR"), c.createDepartment);
router.put("/:id", requireRole("ADMINISTRATOR"), c.updateDepartment);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteDepartment);
export default router;

