import { Router } from "express";
import * as c from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth, requireRole("ADMINISTRATOR"));
router.get("/", c.listUsers);
router.get("/:id", c.getUser);
router.post("/", c.createUser);
router.put("/:id", c.updateUser);
router.patch("/:id/status", c.updateUserStatus);
router.delete("/:id", c.deleteUser);
export default router;
