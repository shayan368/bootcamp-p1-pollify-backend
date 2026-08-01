import express from "express";
import { upload } from "../config/cloudinary.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import {
  createPoll,
  getPolls,
  getPollById,
  votePoll,
  closePoll,
  deletePoll,
  getMyVotedPolls,
  getPollTypeCounts,
} from "../controllers/pollController.js";
import { addComment, getComments } from "../controllers/commentController.js";

const router = express.Router();

router.post("/", protect, upload.any(), createPoll);
router.get("/", optionalAuth, getPolls);


router.get("/mine/voted", protect, getMyVotedPolls);
router.get("/types/counts", getPollTypeCounts);

router.get("/:id", optionalAuth, getPollById);
router.post("/:id/vote", protect, votePoll);
router.put("/:id/close", protect, closePoll);
router.delete("/:id", protect, deletePoll);

// comments 
router.post("/:pollId/comments", protect, addComment);
router.get("/:pollId/comments", getComments);

export default router;
