import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { startAIWorker } from "./workers/ai.worker";
import { createQueueEvents } from "./config/queue";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  try {
    // Step 1: Connect to database
    await connectDatabase();

    // Step 2: Start queue event listeners
    createQueueEvents();

    // Step 3: Start background AI worker
    startAIWorker();

    // Step 4: Start HTTP server
    app.listen(PORT, () => {
      logger.info(
        { port: PORT, env: process.env.NODE_ENV },
        "Server started"
      );
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

bootstrap();