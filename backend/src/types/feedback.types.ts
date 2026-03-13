// backend/src/types/feedback.types.ts

export type FeedbackStatus = "open" | "in_progress" | "resolved";

export type FeedbackCategory =| "payment"| "ui_bug"| "feature_request"| "performance"| "security"| "onboarding"| "other";

export type FeedbackPriority = "critical" | "high" | "medium" | "low";

export type FeedbackSentiment = "positive" | "negative" | "neutral";

export type TeamName =| "payments"| "frontend"| "product"| "infrastructure"| "security"| "growth"| "general";

// What is the user sends
export interface CreateFeedbackDTO {
  userName: string;
  email: string;
  message: string;
}

// What is the AI returns
export interface AIAnalysisResult {
  category: FeedbackCategory;
  priority: FeedbackPriority;
  sentiment: FeedbackSentiment;
  team: TeamName;
  confidence: number;           // 0-1 how confident the AI is
  summary: string;              // one-line summary
}

// Complete feedback document
export interface IFeedback {
  id: string;
  userName: string;
  email: string;
  message: string;
  category: FeedbackCategory | null;
  priority: FeedbackPriority | null;
  sentiment: FeedbackSentiment | null;
  team: TeamName | null;
  confidence: number | null;
  summary: string | null;
  status: FeedbackStatus;
  aiProcessed: boolean;
  aiProcessedAt: Date | null;
  aiError: string | null;       // track failures
  createdAt: Date;
  updatedAt: Date;
}

// Queue job payload
export interface FeedbackJobPayload {
  feedbackId: string;
  message: string;
  attemptNumber: number;
}

// Search/filter parameters
export interface FeedbackSearchParams {
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  sentiment?: FeedbackSentiment;
  team?: TeamName;
  status?: FeedbackStatus;
  search?: string;              // free text search
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "priority";
  sortOrder?: "asc" | "desc";
}

// Paginated API response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}