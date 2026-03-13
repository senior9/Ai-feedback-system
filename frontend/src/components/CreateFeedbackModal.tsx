// frontend/src/components/CreateFeedbackModal.tsx

import { useState } from "react";
import { useCreateFeedback } from "../hooks/useFeedback";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFeedbackModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    userName: "",
    email: "",
    message: "",
  });

  const { mutate, isPending, isError, error } = useCreateFeedback();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(form, {
      onSuccess: () => {
        setForm({ userName: "", email: "", message: "" });
        onClose();
      },
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Submit Feedback</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={form.userName}
              onChange={(e) =>
                setForm({ ...form, userName: e.target.value })
              }
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="message">Your Feedback</label>
            <textarea
              id="message"
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              placeholder="Describe your issue, suggestion, or experience..."
            />
          </div>

          {isError && (
            <div className="error">
              {error instanceof Error ? error.message : "Submission failed"}
            </div>
          )}

          <div className="actions">
            <button type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}