import { Router } from "express";
import { FeedbackController } from "../controllers/feedback.controller";
import {
  validate,
  createFeedbackSchema,
  searchParamsSchema,
} from "../middleware/validator";
import { createFeedbackLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /api/feedback
router.post(
  "/",
  createFeedbackLimiter,
  validate(createFeedbackSchema, "body"),
  FeedbackController.create
);

// GET /api/feedback
router.get(
  "/",
  validate(searchParamsSchema, "query"),
  FeedbackController.search
);

// GET /api/feedback/stats — MUST be before /:id
router.get("/stats", FeedbackController.getStats);

// GET /api/feedback/:id
router.get("/:id", FeedbackController.getById);

// PATCH /api/feedback/:id/status
// FIX: Added validation middleware
router.patch(
  "/:id/status",
  validate(
    // Inline validation for status update
    require("zod").z.object({
      status: require("zod").z.enum(["open", "in_progress", "resolved"]),
    }),
    "body"
  ),
  FeedbackController.updateStatus
);

export default router;