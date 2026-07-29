import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

// Join table for the self-referential User <-> User "following" relationship
// (was an array of ObjectIds on the User document in Mongo).
class Follow extends Model {}

Follow.init(
  {},
  {
    sequelize,
    modelName: "Follow",
    tableName: "follows",
    timestamps: true,
  }
);

export default Follow;
