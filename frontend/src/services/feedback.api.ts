// frontend/src/services/feedback.api.ts

import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackFilters,
  PaginatedFeedback,
  DashboardStats,
} from "../types";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;

  console.log(`[API] ${options?.method || "GET"} ${url}`);

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("[API] Error:", {
      status: response.status,
      url,
      responseData,
    });
    throw new Error(
      responseData.message || `Request failed: ${response.status}`
    );
  }

  console.log(`[API] Success:`, responseData);
  return responseData;
}

export const feedbackApi = {
  create(input: CreateFeedbackInput) {
    return request<{ success: boolean; data: Feedback }>(
      "/feedback",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
  },

  search(filters: FeedbackFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    return request<PaginatedFeedback>(`/feedback?${params}`);
  },

  getById(id: string) {
    return request<{ success: boolean; data: Feedback }>(
      `/feedback/${id}`
    );
  },

  updateStatus(id: string, status: string) {
    // FIX: Log what we're sending
    console.log("[API] updateStatus called with:", { id, status });

    return request<{ success: boolean; data: Feedback }>(
      `/feedback/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
  },

  getStats() {
    return request<{ success: boolean; data: DashboardStats }>(
      "/feedback/stats"
    );
  },
};