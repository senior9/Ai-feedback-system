import { FeedbackCard } from "./FeedbackCard";
import type { Feedback } from "../types";

interface Props {
  feedbacks: Feedback[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function FeedbackList({
  feedbacks,
  pagination,
  onPageChange,
  isLoading,
}: Props) {
  if (isLoading) {
    return <div className="loading">Loading feedback...</div>;
  }

  if (feedbacks.length === 0) {
    return <div className="empty">No feedback found.</div>;
  }

  return (
    <div className="feedback-list">
      <div className="list-header">
        <span>{pagination.total} feedback items</span>
      </div>

      <div className="cards">
        {feedbacks.map((fb) => (
          <FeedbackCard key={fb.id} feedback={fb} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}