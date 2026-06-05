import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow main website, attendance frontend (Vercel), and local dev
const allowedOrigins = [
  "https://cynexai.in",
  "https://www.cynexai.in",
  // Set FRONTEND_URL env var on Render.com to your Vercel URL, e.g.:
  // https://cynexai-attendance.vercel.app
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: Origin ${origin} not allowed.`), false);
    },
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/scan", scanRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "CynexAI QR Attendance Backend API is running.",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: true,
    message: err.message || "Internal server error.",
  });
});

// Start listening only if not running in a serverless environment (e.g. Netlify)
if (process.env.NODE_ENV !== "production" || process.env.RENDER) {
  app.listen(PORT, () => {
    console.log(`[Server] Attendance backend running on port ${PORT}`);
  });
}

// Export the app for serverless
export default app;
