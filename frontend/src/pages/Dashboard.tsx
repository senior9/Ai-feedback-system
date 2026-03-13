// frontend/src/pages/Dashboard.tsx

import { useState } from "react";
import { FeedbackList } from "../components/FeedbackList";
import { SearchBar } from "../components/SearchBar";
import { CreateFeedbackModal } from "../components/CreateFeedbackModal";
import { useFeedbackList, useFeedbackStats } from "../hooks/useFeedback";
import type { FeedbackFilters } from "../types";

export function Dashboard() {
  const [filters, setFilters] = useState<FeedbackFilters>({
    page: 1,
    limit: 20,
  });
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useFeedbackList(filters);
  const { data: statsData } = useFeedbackStats();

  const stats = statsData?.data;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🧠 AI Feedback Dashboard</h1>
        <button
          className="btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Submit Feedback
        </button>
      </header>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.unprocessed}</span>
            <span className="stat-label">Processing</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {stats.byPriority?.critical || 0}
            </span>
            <span className="stat-label">🔴 Critical</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {stats.bySentiment?.negative || 0}
            </span>
            <span className="stat-label">😤 Negative</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <SearchBar filters={filters} onFilterChange={setFilters} />

      {/* Feedback List */}
      <FeedbackList
        feedbacks={data?.data || []}
        pagination={
          data?.pagination || { total: 0, page: 1, totalPages: 1 }
        }
        onPageChange={(page) => setFilters({ ...filters, page })}
        isLoading={isLoading}
      />

      {/* Create Modal */}
      <CreateFeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}