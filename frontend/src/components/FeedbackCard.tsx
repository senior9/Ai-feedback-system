// frontend/src/components/FeedbackCard.tsx

import type { Feedback } from "../types";
import { getFeedbackId } from "../types";
import { useUpdateStatus } from "../hooks/useFeedback";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "😊",
  negative: "😤",
  neutral: "😐",
};

interface Props {
  feedback: Feedback;
}

export function FeedbackCard({ feedback }: Props) {
  const { mutate: updateStatus, isPending } = useUpdateStatus();

  // ═══════════════════════════════════════
  // FIX: Use safe ID getter
  // ═══════════════════════════════════════
  const feedbackId = getFeedbackId(feedback);

  const handleStatusChange = (newStatus: string) => {
    if (!feedbackId) {
      console.error("No feedback ID available", feedback);
      return;
    }

    console.log("Updating status:", { feedbackId, newStatus });

    updateStatus(
      { id: feedbackId, status: newStatus },
      {
        onSuccess: () => {
          console.log("Status updated successfully");
        },
        onError: (error) => {
          console.error("Status update failed:", error);
        },
      }
    );
  };

  return (
    <div className="feedback-card">
      {/* Header */}
      <div className="card-header">
        <span className="user-name">{feedback.userName}</span>
        <span className="date">
          {new Date(feedback.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Message */}
      <p className="message">{feedback.message}</p>

      {/* AI Analysis Results */}
      {feedback.aiProcessed ? (
        <div className="ai-tags">
          {feedback.category && (
            <span className="tag category">{feedback.category}</span>
          )}

          {feedback.priority && (
            <span
              className="tag priority"
              style={{
                backgroundColor: PRIORITY_COLORS[feedback.priority],
              }}
            >
              {feedback.priority}
            </span>
          )}

          {feedback.sentiment && (
            <span className="tag sentiment">
              {SENTIMENT_EMOJI[feedback.sentiment] || ""}{" "}
              {feedback.sentiment}
            </span>
          )}

          {feedback.team && (
            <span className="tag team">→ {feedback.team}</span>
          )}

          {/* FIX: Show actual confidence */}
          {feedback.confidence !== null && (
            <span
              className="confidence"
              style={{
                color:
                  feedback.confidence >= 0.7
                    ? "#22c55e"
                    : feedback.confidence >= 0.4
                      ? "#eab308"
                      : "#ef4444",
              }}
            >
              {(feedback.confidence * 100).toFixed(0)}% confident
            </span>
          )}
        </div>
      ) : (
        <div className="processing">
          <span className="spinner" /> AI analyzing...
        </div>
      )}

      {/* AI Error indicator */}
      {feedback.aiError && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#f97316",
            marginBottom: "8px",
          }}
        >
          ⚠️ {feedback.aiError}
        </div>
      )}

      {/* Summary */}
      {feedback.summary && (
        <p className="summary">💡 {feedback.summary}</p>
      )}

      {/* Status Control — FIX: proper onChange */}
      <div className="status-control">
        <select
          value={feedback.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isPending}
          style={{ opacity: isPending ? 0.5 : 1 }}
        >
          <option value="open">🔵 Open</option>
          <option value="in_progress">🟡 In Progress</option>
          <option value="resolved">🟢 Resolved</option>
        </select>
        {isPending && (
          <span
            style={{ fontSize: "0.75rem", color: "#94a3b8" }}
          >
            Updating...
          </span>
        )}
      </div>
    </div>
  );
}