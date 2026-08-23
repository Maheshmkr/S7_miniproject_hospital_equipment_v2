import { Router } from "express";
import * as c from "../controllers/checklistController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(requireAuth);

// Engineers read the configured checklist; only administrators author it.
router.get("/templates", c.listTemplates);
router.get("/templates/:id", c.getTemplate);
router.post("/templates", requireRole("ADMINISTRATOR"), c.createTemplate);
router.put("/templates/:id", requireRole("ADMINISTRATOR"), c.updateTemplate);
router.delete("/templates/:id", requireRole("ADMINISTRATOR"), c.deleteTemplate);
router.post("/templates/:id/questions", requireRole("ADMINISTRATOR"), c.addQuestion);
router.put("/questions/:id", requireRole("ADMINISTRATOR"), c.updateQuestion);
router.delete("/questions/:id", requireRole("ADMINISTRATOR"), c.deleteQuestion);

export default router;
