import mongoose, { Schema, Document } from "mongoose";
import type { IFeedback } from "../types/feedback.types";

export interface FeedbackDocument extends Omit<IFeedback, "id">, Document {}

const feedbackSchema = new Schema<FeedbackDocument>(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    // AI-populated fields — null until processed
    category: {
      type: String,
      enum: [
        "payment", "ui_bug", "feature_request",
        "performance", "security", "onboarding", "other",
      ],
      default: null,
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: null,
    },
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"],
      default: null,
    },
    team: {
      type: String,
      enum: [
        "payments", "frontend", "product",
        "infrastructure", "security", "growth", "general",
      ],
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    summary: {
      type: String,
      maxlength: 200,
      default: null,
    },

    // Processing state
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    aiProcessed: {
      type: Boolean,
      default: false,
    },
    aiProcessedAt: {
      type: Date,
      default: null,
    },
    aiError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,        // adds createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// INDEXES — critical for query performance


// Single field indexes for filtering
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ priority: 1 });
feedbackSchema.index({ team: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });     // newest first

// Compound index for common dashboard query
// "Show me all high-priority payment issues"
feedbackSchema.index({ category: 1, priority: 1, createdAt: -1 });

// Compound index for team routing
// "Show payments team their open tickets"
feedbackSchema.index({ team: 1, status: 1, createdAt: -1 });

// Text index for search
feedbackSchema.index(
  { message: "text", userName: "text", summary: "text" },
  { weights: { summary: 3, message: 2, userName: 1 } }
);

// Index for finding unprocessed feedback
feedbackSchema.index({ aiProcessed: 1, createdAt: 1 });

export const Feedback = mongoose.model<FeedbackDocument>(
  "Feedback",
  feedbackSchema
);