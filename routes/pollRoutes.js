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

// image-type polls send files under per-option field names (option_0, option_1, ...)
// rather than one shared field name, so multer needs each one declared explicitly.
const MAX_OPTIONS = 10;
const optionImageFields = Array.from({ length: MAX_OPTIONS }, (_, i) => ({
  name: `option_${i}`,
  maxCount: 1,
}));

router.post("/", protect, upload.fields(optionImageFields), createPoll);
router.get("/", optionalAuth, getPolls);

// specific routes MUST come before the generic "/:id" route below,
// or express will treat "mine"/"types" as an :id value
router.get("/mine/voted", protect, getMyVotedPolls);
router.get("/types/counts", getPollTypeCounts);

router.get("/:id", optionalAuth, getPollById);
router.post("/:id/vote", protect, votePoll);
router.put("/:id/close", protect, closePoll);
router.delete("/:id", protect, deletePoll);

// comments nested under a poll
router.post("/:pollId/comments", protect, addComment);
router.get("/:pollId/comments", getComments);

export default router;
