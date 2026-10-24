import { Sequelize } from "sequelize";
import "dotenv/config";

const isLocal =
  !process.env.DB_HOST ||
  process.env.DB_HOST === "localhost" ||
  process.env.DB_HOST === "127.0.0.1";

// Enable SSL for remote MySQL hosts like Aiven unless explicitly disabled via DB_SSL=false
const useSSL =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === "true"
    : !isLocal;

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    dialectOptions: useSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false, // Required for Aiven SSL certificates in serverless
          },
        }
      : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

// Cache connection promise/status across serverless invocations
let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    return sequelize;
  }

  try {
    await sequelize.authenticate();
    isConnected = true;
    console.log("MySQL connected successfully");
    return sequelize;
  } catch (err) {
    console.error(`MySQL connection error: ${err.message}`);
    throw err;
  }
};
