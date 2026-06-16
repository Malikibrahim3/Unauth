'use client';

import { useEffect, useState } from 'react';
import { CatchCard } from '@/components/catches/CatchCard';
import type { IdentityCatchEvent } from '@/lib/catches/types';

/**
 * Renders a CatchCard for a specific claim if an identity-resolution catch event
 * exists for it. Silently renders nothing while loading or if no catch is found —
 * the claim detail UI should not flash a skeleton for this optional context.
 */
export function IdentityCatchSection({ claimId }: { claimId: string }) {
  const [event, setEvent] = useState<IdentityCatchEvent | null | 'loading'>('loading');

  useEffect(() => {
    void fetch(`/api/catches?claimId=${encodeURIComponent(claimId)}&limit=1`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: IdentityCatchEvent[]) => {
        setEvent(Array.isArray(data) && data.length > 0 ? (data[0] ?? null) : null);
      })
      .catch(() => setEvent(null));
  }, [claimId]);

  if (event === 'loading' || event === null) return null;

  return (
    <section
      className="rounded-md border"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div
        className="border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Identity resolution
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Unauth detected a non-obvious identity link on this claim
        </p>
      </div>
      <div className="p-4">
        <CatchCard event={event} />
      </div>
    </section>
  );
}
