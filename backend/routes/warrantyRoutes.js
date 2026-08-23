import { Router } from "express";
import * as c from "../controllers/warrantyController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole("ADMINISTRATOR");
const engineer = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER");

// Every signed-in role reads contracts — department scoping applied in the controller.
router.get("/", c.listWarranties);
router.get("/stats", c.warrantyStats);
router.get("/:id", c.getWarranty);
router.get("/:id/history", c.warrantyHistory);

router.post("/", admin, c.createWarranty);
router.put("/:id", engineer, c.updateWarranty);
router.delete("/:id", admin, c.deleteWarranty);
export default router;
