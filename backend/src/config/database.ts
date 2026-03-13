import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI!;

  // Production connection settings
  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,          // connection pool
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
  };

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected successfully");
  });

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed through app termination");
    process.exit(0);
  });

  await mongoose.connect(uri, options);
}