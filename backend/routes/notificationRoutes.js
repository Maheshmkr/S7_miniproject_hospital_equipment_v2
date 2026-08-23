import { Router } from "express";
import * as c from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", c.listNotifications);
router.patch("/read-all", c.markAllNotificationsRead);
router.patch("/:id/read", c.markNotificationRead);
router.post("/", requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER"), c.createNotification);

export default router;
