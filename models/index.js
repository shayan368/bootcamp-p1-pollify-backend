import { sequelize } from "../config/db.js";
import User from "./User.js";
import Poll from "./Poll.js";
import PollOption from "./PollOption.js";
import Vote from "./Vote.js";
import Comment from "./Comment.js";
import Bookmark from "./Bookmark.js";
import Follow from "./Follow.js";

// ---- Poll belongs to a creator (User) ----
User.hasMany(Poll, { foreignKey: "creatorId", as: "polls", onDelete: "CASCADE" });
Poll.belongsTo(User, { foreignKey: "creatorId", as: "creator" });

// ---- Poll has many options ----
Poll.hasMany(PollOption, { foreignKey: "pollId", as: "options", onDelete: "CASCADE" });
PollOption.belongsTo(Poll, { foreignKey: "pollId" });

// ---- Poll has many votes, each vote belongs to a user ----
Poll.hasMany(Vote, { foreignKey: "pollId", as: "votes", onDelete: "CASCADE" });
Vote.belongsTo(Poll, { foreignKey: "pollId" });
User.hasMany(Vote, { foreignKey: "userId", onDelete: "CASCADE" });
Vote.belongsTo(User, { foreignKey: "userId", as: "user" });

// ---- Poll has many comments, each comment belongs to a user, and can reply to another comment ----
Poll.hasMany(Comment, { foreignKey: "pollId", as: "comments", onDelete: "CASCADE" });
Comment.belongsTo(Poll, { foreignKey: "pollId" });
User.hasMany(Comment, { foreignKey: "userId", onDelete: "CASCADE" });
Comment.belongsTo(User, { foreignKey: "userId", as: "user" });
Comment.belongsTo(Comment, { foreignKey: "parentId", as: "parent" });
Comment.hasMany(Comment, { foreignKey: "parentId", as: "replies" });

// ---- User <-> Poll bookmarks (many-to-many) ----
User.belongsToMany(Poll, { through: Bookmark, as: "bookmarkedPolls", foreignKey: "userId" });
Poll.belongsToMany(User, { through: Bookmark, as: "bookmarkedBy", foreignKey: "pollId" });

// ---- User <-> User follows (self-referential many-to-many) ----
User.belongsToMany(User, {
  through: Follow,
  as: "following",
  foreignKey: "followerId",
  otherKey: "followingId",
});
User.belongsToMany(User, {
  through: Follow,
  as: "followers",
  foreignKey: "followingId",
  otherKey: "followerId",
});

export { sequelize, User, Poll, PollOption, Vote, Comment, Bookmark, Follow };
