import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User, Poll, PollOption, Vote, Comment, Bookmark, Follow } from "../models/index.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { generateOtp, otpExpiry, otpValid } from "../utils/otp.js";
import { sendOtpEmail } from "../config/mailer.js";

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const clean = (u) => ({
  id: u.id,
  _id: u.id,
  name: u.name,
  email: u.email,
  username: u.username,
  avatar: u.avatar,
  bio: u.bio,
});

// @route POST /api/auth/register
// register a user and send an otp to their email
export const register = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exist = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
    
    let avatar = "";
    if (req.file) {
      try {
        avatar = await uploadToCloudinary(req.file.buffer);
      } catch (e) {
        console.warn("Avatar upload skipped:", e.message);
      }
    }

    const otp = generateOtp();
    console.log(`🔑 [OTP GENERATED] for ${email}: ${otp}`);

    if (exist) {
      // If user exists but is NOT verified, allow re-registration / updating details & sending new OTP
      if (!exist.isVerified) {
        exist.name = name;
        exist.password = password; // beforeSave hook hashes password
        if (avatar) exist.avatar = avatar;
        exist.otp = otp;
        exist.otpExpires = otpExpiry();
        await exist.save();

        try {
          await sendOtpEmail(email, otp, "verify your Pollify account");
        } catch (emailErr) {
          console.error("❌ Failed to send OTP email during re-registration:", emailErr.message);
          return res.status(500).json({
            message: "Account created, but failed to send OTP email. Please check server SMTP configuration (SMTP_USER / SMTP_PASS).",
          });
        }
        return res.status(200).json({ needsVerification: true, email });
      }

      return res.status(400).json({ message: "Email or username already taken" });
    }

    await User.create({
      name,
      email,
      username,
      password,
      avatar,
      otp,
      otpExpires: otpExpiry(),
    });

    try {
      await sendOtpEmail(email, otp, "verify your Pollify account");
    } catch (emailErr) {
      console.error("❌ Failed to send OTP email during registration:", emailErr.message);
      return res.status(500).json({
        message: "Account created, but failed to send OTP email. Please check server SMTP configuration.",
      });
    }

    res.status(201).json({ needsVerification: true, email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!otpValid(user, otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ token: makeToken(user.id), user: clean(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    console.log(`🔑 [OTP GENERATED (RESEND)] for ${user.email}: ${otp}`);
    user.otp = otp;
    user.otpExpires = otpExpiry();
    await user.save();

    try {
      await sendOtpEmail(user.email, user.otp, "verify your Pollify account");
    } catch (emailErr) {
      console.error("❌ Failed to send OTP email on resend:", emailErr.message);
      return res.status(500).json({
        message: "Failed to send OTP email. Please check server SMTP configuration.",
      });
    }

    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isVerified) {
      const otp = generateOtp();
      console.log(`🔑 [OTP GENERATED (LOGIN)] for ${email}: ${otp}`);
      user.otp = otp;
      user.otpExpires = otpExpiry();
      await user.save();

      try {
        await sendOtpEmail(user.email, user.otp, "verify your Pollify account");
      } catch (emailErr) {
        console.error("❌ Failed to send OTP email on login attempt:", emailErr.message);
      }

      return res
        .status(403)
        .json({ message: "Please verify your email first. A new OTP has been sent to your email.", needsVerification: true, email });
    }
    res.json({ token: makeToken(user.id), user: clean(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/users/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const [pollCount, votedCount, bookmarkCount, followingCount, followerCount] = await Promise.all([
      Poll.count({ where: { creatorId: user.id } }),
      Vote.count({ where: { userId: user.id } }),
      Bookmark.count({ where: { userId: user.id } }),
      Follow.count({ where: { followerId: user.id } }),
      Follow.count({ where: { followingId: user.id } }),
    ]);

    res.json({
      user: clean(user),
      pollCount,
      votedCount,
      bookmarkCount,
      followingCount,
      followerCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/users/me/bookmarks
export const getMyBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.findAll({ where: { userId: req.userId }, attributes: ["pollId"] });
    const pollIds = bookmarks.map((b) => b.pollId);

    const polls = await Poll.findAll({
      where: { id: pollIds.length ? pollIds : [0] },
      include: [
        { model: User, as: "creator", attributes: ["id", "name", "username", "avatar"] },
        { model: PollOption, as: "options" },
        { model: Vote, as: "votes" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ polls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/users/:username
// public profile lookup
export const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const [pollCount, votedCount, followingCount, followerCount] = await Promise.all([
      Poll.count({ where: { creatorId: user.id } }),
      Vote.count({ where: { userId: user.id } }),
      Follow.count({ where: { followerId: user.id } }),
      Follow.count({ where: { followingId: user.id } }),
    ]);

    // is the requesting user (if any) already following this profile?
    let isFollowing = false;
    if (req.userId) {
      const existing = await Follow.findOne({ where: { followerId: req.userId, followingId: user.id } });
      isFollowing = Boolean(existing);
    }

    res.json({
      user: clean(user),
      pollCount,
      votedCount,
      followingCount,
      followerCount,
      isFollowing,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/users/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, username, bio } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username && username !== user.username) {
      const taken = await User.findOne({ where: { username } });
      if (taken) return res.status(400).json({ message: "Username already taken" });
      user.username = username;
    }
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (req.file) {
      try {
        user.avatar = await uploadToCloudinary(req.file.buffer);
      } catch (e) {
        console.warn("Avatar upload skipped:", e.message);
      }
    }
    await user.save();
    res.json({ user: clean(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/users/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // beforeUpdate hook re-hashes this
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route DELETE /api/users/me
export const deleteAccount = async (req, res) => {
  try {
    const id = req.userId;
    const myPolls = await Poll.findAll({ where: { creatorId: id }, attributes: ["id"] });
    const pollIds = myPolls.map((p) => p.id);

    await Comment.destroy({
      where: { [Op.or]: [{ userId: id }, { pollId: { [Op.in]: pollIds } }] },
    });
    await Bookmark.destroy({ where: { [Op.or]: [{ userId: id }, { pollId: { [Op.in]: pollIds } }] } });
    await Follow.destroy({ where: { [Op.or]: [{ followerId: id }, { followingId: id }] } });
    await Poll.destroy({ where: { creatorId: id } }); // cascades to options/votes/comments
    await User.destroy({ where: { id } });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/users/:id/follow
export const followUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.userId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }
    const target = await User.findByPk(targetId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const existing = await Follow.findOne({
      where: { followerId: req.userId, followingId: targetId },
    });

    if (existing) {
      await existing.destroy();
    } else {
      await Follow.create({ followerId: req.userId, followingId: targetId });
    }

    res.json({ following: !existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route PUT /api/users/bookmarks/:pollId
export const toggleBookmark = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findByPk(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const existing = await Bookmark.findOne({ where: { userId: req.userId, pollId } });

    if (existing) {
      await existing.destroy();
    } else {
      await Bookmark.create({ userId: req.userId, pollId });
    }

    res.json({ bookmarked: !existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
