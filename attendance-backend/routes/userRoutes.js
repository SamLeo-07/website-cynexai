import express from "express";
import { createUser, getUsers, updateUser, deleteUser, getProfile, updateProfile } from "../controllers/userController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Profile endpoints (available to all authenticated roles)
router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);

// User CRUD
router.get("/", authenticateJWT, authorizeRoles("admin", "trainer", "clerk"), getUsers);
router.post("/", authenticateJWT, authorizeRoles("admin"), createUser);
router.post("/create", authenticateJWT, authorizeRoles("admin"), createUser); // Fallback
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateUser);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteUser);

export default router;
