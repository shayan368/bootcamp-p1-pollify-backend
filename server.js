import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

import { connectDB, sequelize } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const PORT = process.env.PORT || 5000;
const app = express();

// Parse allowed frontend origins from environment variables
const configuredOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((url) => url.split(",").map((s) => s.trim().replace(/\/$/, "")));

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, postman)
      if (!origin) return callback(null, true);

      // In development or if no explicit origins configured, allow all origins
      if (
        configuredOrigins.length === 0 ||
        (process.env.NODE_ENV !== "production" &&
          (origin.includes("localhost") || origin.includes("127.0.0.1")))
      ) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Database connection middleware - ensures reusable connection is established before route handlers
app.use(async (req, res, next) => {
  // Allow simple root status check without waiting on DB if DB is slow
  if (req.path === "/") {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection middleware error:", err.message);
    res.status(500).json({
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Root & Health check routes
app.get("/", (req, res) => {
  res.send("Pollify API is running");
});

app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message,
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes); // register, login, verify-otp, resend-otp
app.use("/api/users", userRoutes); // me, bookmarks, profile, password, follow
app.use("/api/polls", pollRoutes); // poll feed, voting, results, poll comments
app.use("/api/comments", commentRoutes); // delete comment
app.use("/api/notifications", notificationRoutes); // in-app notifications

// Centralized error handling middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ message: err.message });
  }

  console.error("Server Error:", err.stack || err.message);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message || "Internal server error",
  });
});

// Only bind to local port when running outside Vercel (e.g. local dev, npm start)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

// Export default app for Vercel's zero-config Express runtime
export default app;

