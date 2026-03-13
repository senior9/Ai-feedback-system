import { Queue, QueueEvents } from "bullmq";
import { redisOptions } from "./redis";
import { logger } from "./logger";

const QUEUE_NAME = "feedback-processing";

export function createFeedbackQueue(): Queue {
  const queue = new Queue(QUEUE_NAME, {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  logger.info("Feedback queue created");
  return queue;
}

export function createQueueEvents(): QueueEvents {
  const events = new QueueEvents(QUEUE_NAME, {
    connection: redisOptions,
  });

  events.on("completed", ({ jobId }) => logger.info({ jobId }, "Job completed"));
  events.on("failed", ({ jobId, failedReason }) =>
    logger.error({ jobId, failedReason }, "Job failed")
  );

  return events;
}