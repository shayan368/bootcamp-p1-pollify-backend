import express from "express";
import { upload } from "../config/cloudinary.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import {
  getMe,
  getMyBookmarks,
  getUserByUsername,
  updateProfile,
  changePassword,
  deleteAccount,
  requestDeleteAccount,
  followUser,
  toggleBookmark,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.get("/me/bookmarks", protect, getMyBookmarks);
router.put("/profile", protect, upload.single("avatar"), updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/request-delete-account", protect, requestDeleteAccount);
router.delete("/me", protect, deleteAccount);

router.put("/:id/follow", protect, followUser);
router.put("/bookmarks/:pollId", protect, toggleBookmark);

router.get("/:username", optionalAuth, getUserByUsername);

export default router;
