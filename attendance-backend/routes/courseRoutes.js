import express from "express";
import { getCourses, createCourse, updateCourse, deleteCourse } from "../controllers/courseController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateJWT, getCourses);
router.post("/", authenticateJWT, authorizeRoles("admin"), createCourse);
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateCourse);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteCourse);

export default router;
