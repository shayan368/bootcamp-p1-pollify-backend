import express from "express";
import { protect } from "../middleware/auth.js";
import { getMyNotifications, markAllRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/read-all", protect, markAllRead);

export default router;
