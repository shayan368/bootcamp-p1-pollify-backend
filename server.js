import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";

const PORT = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// db - connects to MySQL and syncs the Sequelize models into tables
connectDB();

// routes
app.use("/api/auth", authRoutes); // register/login/verify-otp/resend-otp
app.use("/api/users", userRoutes); // me/:username/profile/change-password/follow/bookmarks
app.use("/api/polls", pollRoutes);
app.use("/api/comments", commentRoutes);

app.get("/", (req, res) => {
  res.send("Pollify API is running");
});

// basic error handler for anything thrown outside try/catch
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
