import express from "express";
import { startScan, trainerScan, studentScan, endScan, studentEndScan } from "../controllers/scanController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/start", authenticateJWT, authorizeRoles("clerk"), startScan);
router.post("/trainer", authenticateJWT, authorizeRoles("trainer"), trainerScan);
router.post("/student", authenticateJWT, authorizeRoles("student"), studentScan);
router.post("/student/end", authenticateJWT, authorizeRoles("student"), studentEndScan);
router.post("/end", authenticateJWT, authorizeRoles("clerk"), endScan);

export default router;
