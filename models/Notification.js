import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per notification event. "recipientId" is who sees it, "actorId" is who
// triggered it (the voter/commenter). We never create a row where they're the same
// person - see the guard in pollController/commentController where these are created.
class Notification extends Model {}

Notification.init(
  {
    type: {
      type: DataTypes.ENUM("vote", "comment"),
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "notifications",
    timestamps: true,
  }
);

export default Notification;
