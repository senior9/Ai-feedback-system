import { useState } from "react";
import type { FeedbackFilters } from "../types";

interface Props {
  filters: FeedbackFilters;
  onFilterChange: (filters: FeedbackFilters) => void;
}

export function SearchBar({ filters, onFilterChange }: Props) {
  const [search, setSearch] = useState(filters.search || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search, page: 1 });
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search feedback..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="filters">
        <select
          value={filters.category || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              category: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">All Categories</option>
          <option value="payment">Payment</option>
          <option value="ui_bug">UI Bug</option>
          <option value="feature_request">Feature Request</option>
          <option value="performance">Performance</option>
          <option value="security">Security</option>
          <option value="onboarding">Onboarding</option>
          <option value="other">Other</option>
        </select>

        <select
          value={filters.priority || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              priority: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">All Priorities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        <select
          value={filters.sentiment || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              sentiment: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">All Sentiments</option>
          <option value="positive">😊 Positive</option>
          <option value="negative">😤 Negative</option>
          <option value="neutral">😐 Neutral</option>
        </select>

        <select
          value={filters.status || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              status: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
    </div>
  );
}