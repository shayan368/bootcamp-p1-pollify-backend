import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per (poll, user). "value" holds:
//  - the option index as a string, for "single"/"yesno"/"image" polls
//  - a number 1-5 as a string, for "rating" polls
//  - free text, for "open" polls
class Vote extends Model {}

Vote.init(
  {
    value: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Vote",
    tableName: "votes",
    timestamps: true,
    indexes: [
      // one vote per user per poll - voting again updates the existing row
      { unique: true, fields: ["pollId", "userId"] },
    ],
  }
);

export default Vote;
