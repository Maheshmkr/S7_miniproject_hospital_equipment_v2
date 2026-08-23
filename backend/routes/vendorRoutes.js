import { Router } from "express";
import * as c from "../controllers/vendorController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole("ADMINISTRATOR");
const engineer = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER");

// Every signed-in role reads the vendor register (read-only for staff).
router.get("/", c.listVendors);
router.get("/stats", c.vendorStats);
router.get("/:id", c.getVendor);
router.get("/:id/history", c.vendorHistory);

router.post("/", admin, c.createVendor);
router.put("/:id", engineer, c.updateVendor);
router.patch("/:id/status", admin, c.updateVendorStatus);
router.delete("/:id", admin, c.deleteVendor);

export default router;
