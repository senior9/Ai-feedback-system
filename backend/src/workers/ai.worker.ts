// backend/src/workers/ai.worker.ts

import { Worker, Job } from "bullmq";
import { redisOptions } from "../config/redis";
import { AIService } from "../services/ai.service";
import { NotificationService } from "../services/notification.service";
import { Feedback } from "../models/feedback.model";
import { logger } from "../config/logger";
import type { FeedbackJobPayload } from "../types/feedback.types";

const QUEUE_NAME = "feedback-processing";

export function startAIWorker(): Worker {
  const aiService = new AIService();
  const notificationService = new NotificationService();

  const worker = new Worker<FeedbackJobPayload>(
    QUEUE_NAME,
    async (job: Job<FeedbackJobPayload>) => {
      const { feedbackId, message } = job.data;
      const startTime = Date.now();

      logger.info(
        {
          jobId: job.id,
          feedbackId,
          attempt: job.attemptsMade + 1,
          maxAttempts: 3,
        },
        "Processing feedback with AI"
      );

      try {
        let analysis;
        let usedFallback = false;

        try {
          analysis = await aiService.analyzeFeedback(message);

          logger.info(
            {
              feedbackId,
              confidence: analysis.confidence,
              category: analysis.category,
            },
            "AI analysis succeeded"
          );
        } catch (aiError) {
          // ════════════════════════════════════════════
          // LOG THE ACTUAL ERROR — this tells us WHY
          // ════════════════════════════════════════════
          logger.error(
            {
              feedbackId,
              attempt: job.attemptsMade + 1,
              errorName: aiError instanceof Error ? aiError.name : "Unknown",
              errorMessage: aiError instanceof Error ? aiError.message : String(aiError),
              errorStack: aiError instanceof Error ? aiError.stack : undefined,
            },
            "AI analysis attempt failed — FULL ERROR DETAILS"
          );

          if (job.attemptsMade >= 2) {
            logger.warn(
              { feedbackId },
              "All AI retries exhausted — using fallback"
            );
            analysis = AIService.fallbackAnalysis(message);
            usedFallback = true;
          } else {
            throw aiError;
          }
        }

        // ════════════════════════════════════════════
        // FIX: Don't add [Fallback] prefix again
        // The fallback method already adds it
        // ════════════════════════════════════════════
        const updatedFeedback = await Feedback.findByIdAndUpdate(
          feedbackId,
          {
            category: analysis.category,
            priority: analysis.priority,
            sentiment: analysis.sentiment,
            team: analysis.team,
            confidence: analysis.confidence,
            summary: analysis.summary,          // ◀── NO extra prefix
            aiProcessed: true,
            aiProcessedAt: new Date(),
            aiError: usedFallback
              ? "AI failed — used keyword fallback"
              : null,
          },
          { new: true }
        );

        if (!updatedFeedback) {
          throw new Error(`Feedback ${feedbackId} not found`);
        }

        try {
          await notificationService.notifyTeam(updatedFeedback);
        } catch (notifError) {
          logger.error(
            { feedbackId, err: notifError },
            "Notification failed but job continues"
          );
        }

        const duration = Date.now() - startTime;

        logger.info(
          {
            jobId: job.id,
            feedbackId,
            durationMs: duration,
            usedFallback,
            category: analysis.category,
            confidence: analysis.confidence,
          },
          "Feedback processing complete"
        );

        await job.updateProgress(100);

        return { success: true, feedbackId, usedFallback };
      } catch (error) {
        try {
          await Feedback.findByIdAndUpdate(feedbackId, {
            aiError:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });
        } catch (dbError) {
          logger.error({ feedbackId }, "Failed to update aiError");
        }

        throw error;
      }
    },
    {
      connection: redisOptions,
      concurrency: 3,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, feedbackId: job.data.feedbackId },
      "Worker: job completed"
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        feedbackId: job?.data.feedbackId,
        error: err.message,
        attemptsMade: job?.attemptsMade,
      },
      "Worker: job FAILED"
    );
  });

  worker.on("error", (err) => {
    logger.error({ err: err.message }, "Worker: system error");
  });

  logger.info("AI processing worker started");
  return worker;
}