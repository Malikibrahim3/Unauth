'use client';

import { useState } from 'react';
import { STATUS_LABELS, STATUS_OPTIONS, statusStyle } from '@/lib/utils/investigationStatus';
import { track } from '@/lib/analytics/amplitude';

export default function InvestigationStatusSelect({ profileId, initialStatus }: { profileId: string; initialStatus: string | null }) {
  const [status, setStatus] = useState<string>(initialStatus ?? 'new');
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const prev = status;
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${profileId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setStatus(prev);
      } else {
        track('Investigation Status Changed', { from: prev, to: newStatus });
      }
    } catch {
      setStatus(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={saving}
      className="text-sm rounded-md px-2.5 py-1 font-medium focus:outline-none cursor-pointer disabled:opacity-60"
      style={statusStyle(status)}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
