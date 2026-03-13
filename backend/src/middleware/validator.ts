import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";


// Input schemas — never trust user input


export const createFeedbackSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email too long"),

  message: z
    .string()
    .trim()
    .min(10, "Feedback must be at least 10 characters")
    .max(5000, "Feedback too long"),
});

export const searchParamsSchema = z.object({
  category: z
    .enum([
      "payment", "ui_bug", "feature_request",
      "performance", "security", "onboarding", "other",
    ])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  team: z
    .enum([
      "payments", "frontend", "product",
      "infrastructure", "security", "growth", "general",
    ])
    .optional(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Generic validation middleware factory
export function validate(schema: z.ZodSchema, source: "body" | "query") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      logger.warn({ errors, source }, "Validation failed");

      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }

    // Replace raw input with validated + sanitized data
    req[source] = result.data;
    next();
  };
}