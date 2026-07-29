import { Sequelize } from "sequelize";
import "dotenv/config";

// Connects to MySQL running under XAMPP (via phpMyAdmin's underlying server).
// Default XAMPP MySQL: host=localhost, user=root, password="", port=3306.
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected");

    // creates the database tables from the models if they don't exist yet,
    // and adds any missing columns. Safe to leave on in development.
    // In production, use proper migrations instead of sync({ alter: true }).
    await sequelize.sync({ alter: true });
    console.log("Models synced");
  } catch (err) {
    console.error(`MySQL connection error: ${err.message}`);
    process.exit(1);
  }
};
