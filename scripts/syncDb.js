import { sequelize } from "../models/index.js";

async function sync() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Connected to MySQL.");

    const shouldAlter = process.argv.includes("--alter");
    console.log(`Synchronizing models (alter: ${shouldAlter})...`);

    await sequelize.sync({ alter: shouldAlter });
    console.log("Database tables synchronized successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

sync();
