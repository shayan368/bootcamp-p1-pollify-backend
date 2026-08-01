import { Op } from "sequelize";
import { Poll, PollOption, Vote, Comment, User, Bookmark, Follow } from "../models/index.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const pollIncludes = [
  { model: User, as: "creator", attributes: ["id", "name", "username", "avatar"] },
  { model: PollOption, as: "options" },
  { model: Vote, as: "votes", include: [{ model: User, as: "user", attributes: ["id", "username"] }] },
];

// @route POST /api/polls
export const createPoll = async (req, res) => {
  try {
    const { question, type, category } = req.body;
    let { options } = req.body;

    if (!question || !type) {
      return res.status(400).json({ message: "Question and type are required" });
    }

    // options may arrive as a JSON string (multipart form) or an array
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch {
        options = [];
      }
    }

    if (["single", "image"].includes(type) && (!options || options.length < 2)) {
      return res.status(400).json({ message: "Provide at least 2 options" });
    }
    if (type === "yesno") {
      options = [{ text: "Yes" }, { text: "No" }];
    }

    // handle option image uploads for "image" type polls (fields named option_0, option_1, ...)
    if (type === "image" && req.files && req.files.length) {
      await Promise.all(
        req.files.map(async (file) => {
          if (!file.fieldname.startsWith("option_")) return;
          const idx = Number(file.fieldname.replace("option_", ""));
          try {
            const url = await uploadToCloudinary(file.buffer);
            if (options[idx]) options[idx].image = url;
          } catch (e) {
            console.warn("Option image upload skipped:", e.message);
          }
        })
      );
    }

    const poll = await Poll.create({
      creatorId: req.userId,
      question,
      type,
      category: category || "General",
    });

    if (options && options.length) {
      await PollOption.bulkCreate(
        options.map((opt, i) => ({
          pollId: poll.id,
          text: opt.text || null,
          image: opt.image || null,
          position: i,
        }))
      );
    }

    const created = await Poll.findByPk(poll.id, { include: pollIncludes });
    res.status(201).json({ poll: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/polls  (feed - newest first, optional filters)
export const getPolls = async (req, res) => {
  try {
    const { category, creator, type, search, following, page = 1, limit = 10 } = req.query;
    const where = {};
    if (category && category !== "All") where.category = category;
    if (creator) where.creatorId = creator;
    if (type && type !== "all") where.type = type;
    if (search) where.question = { [Op.like]: `%${search}%` };

    // "following" feed - only polls created by people the current user follows
    if (following === "true") {
      if (!req.userId) return res.status(401).json({ message: "Not authorized, no token" });
      const follows = await Follow.findAll({ where: { followerId: req.userId }, attributes: ["followingId"] });
      const followingIds = follows.map((f) => f.followingId);
      where.creatorId = { [Op.in]: followingIds.length ? followingIds : [0] };
    }

    const { count, rows } = await Poll.findAndCountAll({
      where,
      include: pollIncludes,
      order: [["createdAt", "DESC"]],
      offset: (Number(page) - 1) * Number(limit),
      limit: Number(limit),
      distinct: true, // keeps count accurate with the joined includes
    });

    res.json({
      polls: rows,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/polls/mine/voted  (polls the current user has voted on)
export const getMyVotedPolls = async (req, res) => {
  try {
    const votes = await Vote.findAll({ where: { userId: req.userId }, attributes: ["pollId"] });
    const pollIds = votes.map((v) => v.pollId);

    const polls = await Poll.findAll({
      where: { id: { [Op.in]: pollIds.length ? pollIds : [0] } },
      include: pollIncludes,
      order: [["createdAt", "DESC"]],
    });

    res.json({ polls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/polls/types/counts  (how many polls exist per type, for the stats widget)
export const getPollTypeCounts = async (req, res) => {
  try {
    const types = ["single", "yesno", "rating", "image", "open"];
    const counts = {};
    for (const t of types) {
      counts[t] = await Poll.count({ where: { type: t } });
    }
    res.json({ counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/polls/:id
export const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id, { include: pollIncludes });
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    poll.views += 1;
    await poll.save();

    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/polls/:id/vote
export const votePoll = async (req, res) => {
  try {
    const { value } = req.body;
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.closed) return res.status(400).json({ message: "This poll is closed" });

    const existing = await Vote.findOne({ where: { pollId: poll.id, userId: req.userId } });
    if (existing) {
      existing.value = String(value);
      await existing.save();
    } else {
      await Vote.create({ pollId: poll.id, userId: req.userId, value: String(value) });
    }

    const updated = await Poll.findByPk(poll.id, { include: pollIncludes });
    res.json({ poll: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/polls/:id/close
export const closePoll = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.creatorId !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    poll.closed = true;
    await poll.save();
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/polls/:id
export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.creatorId !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    // options/votes/comments cascade-delete via the FK constraints in models/index.js
    await poll.destroy();
    res.json({ message: "Poll deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
