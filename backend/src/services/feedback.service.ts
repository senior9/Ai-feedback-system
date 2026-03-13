import { Feedback, FeedbackDocument } from "../models/feedback.model";
import { createFeedbackQueue } from "../config/queue";
import { logger } from "../config/logger";
import { AppError } from "../middleware/errorHandler";
import type {
  CreateFeedbackDTO,
  FeedbackSearchParams,
  PaginatedResponse,
  FeedbackJobPayload,
} from "../types/feedback.types";
import { Queue } from "bullmq";

export class FeedbackService {
  private queue: Queue;

  constructor() {
    this.queue = createFeedbackQueue();
  }

  // ════════════════════════════════════
  // CREATE
  // ════════════════════════════════════
  async createFeedback(
    dto: CreateFeedbackDTO
  ): Promise<FeedbackDocument> {
    const startTime = Date.now();

    const feedback = await Feedback.create({
      userName: dto.userName,
      email: dto.email,
      message: dto.message,
    });

    logger.info(
      { feedbackId: feedback._id, durationMs: Date.now() - startTime },
      "Feedback saved to database"
    );

    const jobPayload: FeedbackJobPayload = {
      feedbackId: feedback._id.toString(),
      message: feedback.message,
      attemptNumber: 1,
    };

    await this.queue.add("analyze-feedback", jobPayload, {
      jobId: `feedback-${feedback._id.toString()}`,
      priority: 1,
    });

    logger.info(
      { feedbackId: feedback._id },
      "AI processing job queued"
    );

    return feedback;
  }

  // ════════════════════════════════════
  // GET BY ID
  // ════════════════════════════════════
  async getFeedbackById(id: string): Promise<FeedbackDocument> {
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      throw new AppError(404, "Feedback not found");
    }

    return feedback;
  }

  // ════════════════════════════════════════════════════════════
  // SEARCH — THIS IS WHERE THE BUG WAS
  // ════════════════════════════════════════════════════════════
  async searchFeedback(
    params: FeedbackSearchParams
  ): Promise<PaginatedResponse<any>> {
    const {
      category,
      priority,
      sentiment,
      team,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const filter: Record<string, unknown> = {};

    if (category)  filter.category  = category;
    if (priority)  filter.priority  = priority;
    if (sentiment) filter.sentiment = sentiment;
    if (team)      filter.team      = team;
    if (status)    filter.status    = status;

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [rawData, total] = await Promise.all([
      Feedback.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(filter),
    ]);

    // ═══════════════════════════════════════════
    // FIX: Transform _id → id manually
    // .lean() skips toJSON transform
    // Without this, frontend gets _id not id
    // ═══════════════════════════════════════════
    const data = rawData.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    logger.info(
      {
        filterKeys: Object.keys(filter),
        total,
        page,
        limit,
      },
      "Search executed"
    );

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════
  // UPDATE STATUS — FIX: Add proper ID validation
  // ═══════════════════════════════════════════════
  async updateStatus(
    id: string,
    status: "open" | "in_progress" | "resolved"
  ): Promise<FeedbackDocument> {
    // Validate that id is a proper MongoDB ObjectId
    if (!id || id === "undefined" || id === "null") {
      throw new AppError(400, "Invalid feedback ID");
    }

    // Check if valid ObjectId format
    const mongoose = await import("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, `Invalid feedback ID format: ${id}`);
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      throw new AppError(404, "Feedback not found");
    }

    logger.info(
      { feedbackId: id, newStatus: status },
      "Feedback status updated"
    );

    return feedback;
  }

  // ════════════════════════════════════
  // DASHBOARD STATS
  // ════════════════════════════════════
  async getStats(): Promise<Record<string, unknown>> {
    const [
      totalCount,
      byCategory,
      byPriority,
      bySentiment,
      byStatus,
      unprocessed,
    ] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Feedback.countDocuments({ aiProcessed: false }),
    ]);

    return {
      total: totalCount,
      unprocessed,
      byCategory: Object.fromEntries(
        byCategory.map((b: any) => [b._id || "unknown", b.count])
      ),
      byPriority: Object.fromEntries(
        byPriority.map((b: any) => [b._id || "unknown", b.count])
      ),
      bySentiment: Object.fromEntries(
        bySentiment.map((b: any) => [b._id || "unknown", b.count])
      ),
      byStatus: Object.fromEntries(
        byStatus.map((b: any) => [b._id || "unknown", b.count])
      ),
    };
  }
}