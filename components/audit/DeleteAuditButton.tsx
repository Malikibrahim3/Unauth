'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteAuditButton({ jobId }: { jobId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/jobs/${jobId}/hide`, { method: 'PATCH' });
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50 hover:bg-[var(--risk-critical-bg)] transition-colors"
          style={{ color: 'var(--risk-critical)' }}
        >
          {loading ? 'Removing…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text-subtle)' }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-md transition-colors hover:bg-[var(--risk-critical-bg)]"
      style={{ color: 'var(--text-disabled)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--risk-critical)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}
      title="Remove from view"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
