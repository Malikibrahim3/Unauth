"use client";

import { useState } from 'react';

const OPTIONS = [
  { value: 'customer_notes', label: 'Customer notes' },
  { value: 'watchlist', label: 'Watchlist entries' },
];

export default function BulkDeleteClient() {
  const [entity, setEntity] = useState(OPTIONS[0].value);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    setMessage(null);
    if (!confirmChecked) {
      setMessage('Please confirm the deletion by checking the box.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/settings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error || 'Delete failed');
      } else {
        setMessage('Delete completed.');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Choose which app data to permanently delete. This action is irreversible.
      </p>

      <div className="flex items-center gap-2">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded px-2 py-1 border"
          style={{ background: 'var(--bg-surface)' }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setEntity('all');
          }}
          className="text-xs font-medium px-2 py-1"
          style={{ color: 'var(--text)' }}
        >
          or Delete All Allowed
        </button>
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => setConfirmChecked(e.target.checked)}
        />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          I understand this will permanently delete the selected data.
        </span>
      </label>

      <div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded px-3 py-2 font-semibold"
          style={{ background: 'var(--risk-critical)', color: 'white' }}
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {message && (
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      )}
    </div>
  );
}
