import { Router } from "express";
import * as c from "../controllers/inventoryController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

const staffAndUp = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER", "TECHNICIAN", "DEPARTMENT_STAFF");
const techAndUp = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER", "TECHNICIAN");
const engineerAndUp = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER");
const adminOnly = requireRole("ADMINISTRATOR");

router.use(requireAuth);

/* Stats and alerts */
router.get("/stats", staffAndUp, c.getInventoryStats);
router.get("/alerts", staffAndUp, c.getLowStockAlerts);
router.get("/movements", staffAndUp, c.getAllMovements);

/* List & Details */
router.get("/", staffAndUp, c.listInventory);
router.get("/:id", staffAndUp, c.getInventoryItem);
router.get("/:id/movements", staffAndUp, c.getItemMovements);

/* Item mutations */
router.post("/", engineerAndUp, c.createInventoryItem);
router.put("/:id", engineerAndUp, c.updateInventoryItem);
router.delete("/:id", adminOnly, c.deleteInventoryItem);

/* Stock Operations */
router.post("/:id/receive", engineerAndUp, c.receiveStock);
router.post("/:id/issue", techAndUp, c.issueStock);
router.post("/:id/return", techAndUp, c.returnStock);
router.post("/:id/adjust", engineerAndUp, c.adjustStock);
router.post("/:id/transfer", engineerAndUp, c.transferStock);

export default router;
