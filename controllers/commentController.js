import { Comment, User } from "../models/index.js";

// @route POST /api/polls/:pollId/comments
export const addComment = async (req, res) => {
  try {
    const { text, parent } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const comment = await Comment.create({
      pollId: req.params.pollId,
      userId: req.userId,
      parentId: parent || null,
      text,
    });

    const populated = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: "user", attributes: ["id", "name", "username", "avatar"] }],
    });

    res.status(201).json({ comment: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/polls/:pollId/comments
export const getComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { pollId: req.params.pollId },
      include: [{ model: User, as: "user", attributes: ["id", "name", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/comments/:id
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    // also remove any direct replies to this comment
    await Comment.destroy({ where: { parentId: comment.id } });
    await comment.destroy();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
