export interface Feedback {
  id: string;
  _id?: string;              // ◀── FIX: handle both formats
  userName: string;
  email: string;
  message: string;
  category: string | null;
  priority: string | null;
  sentiment: string | null;
  team: string | null;
  confidence: number | null;
  summary: string | null;
  status: "open" | "in_progress" | "resolved";
  aiProcessed: boolean;
  aiError: string | null;    // ◀── NEW: show AI errors
  createdAt: string;
}

export interface CreateFeedbackInput {
  userName: string;
  email: string;
  message: string;
}

export interface FeedbackFilters {
  category?: string;
  priority?: string;
  sentiment?: string;
  team?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedFeedback {
  success: boolean;
  data: Feedback[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  total: number;
  unprocessed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  bySentiment: Record<string, number>;
  byStatus: Record<string, number>;
}

// ═══════════════════════════════════════
// HELPER: safely get feedback ID
// handles both "id" and "_id"
// ═══════════════════════════════════════
export function getFeedbackId(feedback: Feedback): string {
  return feedback.id || feedback._id || "";
}