import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

// Join table for the User <-> Poll many-to-many "bookmarks" relationship
// (was an array of ObjectIds on the User document in Mongo).
class Bookmark extends Model {}

Bookmark.init(
  {},
  {
    sequelize,
    modelName: "Bookmark",
    tableName: "bookmarks",
    timestamps: true,
  }
);

export default Bookmark;
