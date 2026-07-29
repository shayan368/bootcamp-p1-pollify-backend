import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

// Mongo stored options as an embedded array on the poll document.
// MySQL is relational, so each option becomes its own row here,
// linked back to its poll via pollId (added in models/index.js).
class PollOption extends Model {}

PollOption.init(
  {
    text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // preserves the order the creator added options in
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "PollOption",
    tableName: "poll_options",
    timestamps: false,
  }
);

export default PollOption;
