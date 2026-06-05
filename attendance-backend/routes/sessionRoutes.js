import express from "express";
import { 
  createSession, 
  getSessions, 
  getTodaySessions, 
  getMySessions, 
  updateSession, 
  deleteSession 
} from "../controllers/sessionController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific routes must come first
router.get("/today", authenticateJWT, getTodaySessions);
router.get("/my", authenticateJWT, authorizeRoles("trainer"), getMySessions);

// CRUD routes
router.get("/", authenticateJWT, authorizeRoles("admin"), getSessions);
router.post("/", authenticateJWT, authorizeRoles("admin"), createSession);
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateSession);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteSession);

export default router;
