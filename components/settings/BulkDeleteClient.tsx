"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "customer_notes", label: "Customer notes" },
  { value: "watchlist", label: "Saved customer context" },
  { value: "all", label: "All listed workspace context" },
];

export default function BulkDeleteClient() {
  const [entity, setEntity] = useState(OPTIONS[0].value);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    setMessage(null);
    if (!confirmChecked) {
      setMessage("Please confirm the deletion by checking the box.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error || "Delete failed");
      } else {
        setMessage("Removal completed.");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="ua-text-body" style={{ color: "var(--ua-text-secondary)" }}>
        Hide customer notes, saved customer context, or import and sync job
        cards from active workspace views. This is not customer-data erasure;
        audit and financial records remain available for accountability.
      </p>

      <div>
        <label
          htmlFor="privacy-removal-scope"
          className="ua-text-label mb-1 block"
        >
          Removal scope
        </label>
        <select
          id="privacy-removal-scope"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded px-2 py-1 border"
          style={{ background: "var(--ua-surface-primary)" }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => setConfirmChecked(e.target.checked)}
        />
        <span className="ua-text-body" style={{ color: "var(--ua-text-secondary)" }}>
          I understand this removes the selected data from active workspace
          views.
        </span>
      </label>

      <div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="ua-text-working-title rounded px-3 py-2"
          style={{ background: "var(--ua-risk-critical)", color: "var(--ua-text-inverse)" }}
        >
          {loading ? "Removing…" : "Remove selected data"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="ua-text-body mt-1"
          style={{ color: "var(--ua-text-secondary)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
