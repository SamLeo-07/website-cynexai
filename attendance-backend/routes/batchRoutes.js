import express from "express";
import { 
  getBatches, 
  createBatch, 
  updateBatch, 
  deleteBatch, 
  assignBatch,
  getBatchStudents,
  updateBatchStudents
} from "../controllers/batchController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateJWT, getBatches);
router.post("/", authenticateJWT, authorizeRoles("admin"), createBatch);
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateBatch);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteBatch);
router.post("/assign", authenticateJWT, authorizeRoles("admin"), assignBatch);
router.get("/:id/students", authenticateJWT, authorizeRoles("admin"), getBatchStudents);
router.post("/:id/students", authenticateJWT, authorizeRoles("admin"), updateBatchStudents);

export default router;
