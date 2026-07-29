import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Poll extends Model {}

Poll.init(
  {
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("single", "yesno", "rating", "image", "open"),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: "General",
    },
    closed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // creatorId FK column is added by the association in models/index.js
  },
  {
    sequelize,
    modelName: "Poll",
    tableName: "polls",
    timestamps: true,
  }
);

export default Poll;
