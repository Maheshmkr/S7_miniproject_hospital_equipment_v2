import { Router } from "express";
import * as c from "../controllers/purchaseOrderController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

const admin = requireRole("ADMINISTRATOR");
const engineer = requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER");

// Every signed-in role reads purchase orders — department scoping applied in the controller.
router.get("/", c.listPurchaseOrders);
router.get("/stats", c.purchaseOrderStats);
router.get("/:id", c.getPurchaseOrder);
router.get("/:id/history", c.purchaseOrderHistory);

router.post("/", engineer, c.createPurchaseOrder);
router.put("/:id", engineer, c.updatePurchaseOrder);
router.patch("/:id/status", engineer, c.updatePurchaseOrderStatus);
router.patch("/:id/approve", admin, c.approvePurchaseOrder);
router.patch("/:id/reject", admin, c.rejectPurchaseOrder);
router.delete("/:id", admin, c.deletePurchaseOrder);

export default router;
