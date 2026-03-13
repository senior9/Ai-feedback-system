// frontend/src/hooks/useFeedback.ts

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { feedbackApi } from "../services/feedback.api";
import type { CreateFeedbackInput, FeedbackFilters } from "../types";

export function useFeedbackList(filters: FeedbackFilters) {
  return useQuery({
    queryKey: ["feedbacks", filters],
    queryFn: () => feedbackApi.search(filters),
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useFeedbackStats() {
  return useQuery({
    queryKey: ["feedback-stats"],
    queryFn: () => feedbackApi.getStats(),
    refetchInterval: 10000,
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFeedbackInput) =>
      feedbackApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      // ═══════════════════════════════════════
      // FIX: Validate before sending
      // ═══════════════════════════════════════
      if (!id || id === "undefined") {
        throw new Error("Invalid feedback ID");
      }
      if (!["open", "in_progress", "resolved"].includes(status)) {
        throw new Error("Invalid status value");
      }

      console.log("API call: updateStatus", { id, status });
      return feedbackApi.updateStatus(id, status);
    },
    onSuccess: (data) => {
      console.log("Status update response:", data);

      // Immediately refetch to show updated status
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
    onError: (error) => {
      console.error("Status update error:", error);
    },
  });
}