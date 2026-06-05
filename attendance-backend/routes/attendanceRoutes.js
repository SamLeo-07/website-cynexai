import express from "express";
import { getAttendanceReport, getStudentReport, getScanLogs } from "../controllers/attendanceController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/report", authenticateJWT, getAttendanceReport);
router.get("/student/:id", authenticateJWT, authorizeRoles("admin", "trainer"), getStudentReport);
router.get("/logs", authenticateJWT, authorizeRoles("admin"), getScanLogs);

export default router;
