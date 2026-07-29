import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Comment extends Model {}

Comment.init(
  {
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // pollId, userId, parentId FK columns are added in models/index.js
  },
  {
    sequelize,
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
  }
);

export default Comment;
