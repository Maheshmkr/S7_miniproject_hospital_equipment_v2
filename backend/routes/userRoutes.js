import { Router } from "express";
import * as c from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);
// The user directory is administrator-only; everyone else reads themselves via /api/auth/me.
router.get("/", requireRole("ADMINISTRATOR"), c.listUsers);
router.get("/:id", requireRole("ADMINISTRATOR"), c.getUser);
router.post("/", requireRole("ADMINISTRATOR"), c.createUser);
router.put("/:id", requireRole("ADMINISTRATOR"), c.updateUser);
router.patch("/:id/status", requireRole("ADMINISTRATOR"), c.updateUserStatus);
router.delete("/:id", requireRole("ADMINISTRATOR"), c.deleteUser);
export default router;
