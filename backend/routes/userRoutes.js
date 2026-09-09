import { Router } from "express";
import * as c from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listUsers);
router.get("/:id", c.getUser);
router.post("/", requireRole("ADMINISTRATOR"), c.createUser);
router.put("/:id", requireRole("ADMINISTRATOR"), c.updateUser);
router.patch("/:id/status", requireRole("ADMINISTRATOR"), c.updateUserStatus);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteUser);
export default router;
