"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "customer_notes", label: "Customer notes" },
  { value: "watchlist", label: "Saved customer context" },
  { value: "all", label: "All removable data" },
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
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Choose which data to remove from active workspace views. Audit records
        remain available for accountability.
      </p>

      <div>
        <label
          htmlFor="privacy-removal-scope"
          className="mb-1 block text-xs font-medium"
        >
          Removal scope
        </label>
        <select
          id="privacy-removal-scope"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded px-2 py-1 border"
          style={{ background: "var(--surface)" }}
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
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          I understand this removes the selected data from active workspace
          views.
        </span>
      </label>

      <div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded px-3 py-2 font-semibold"
          style={{ background: "var(--risk-critical)", color: "white" }}
        >
          {loading ? "Removing…" : "Remove selected data"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
