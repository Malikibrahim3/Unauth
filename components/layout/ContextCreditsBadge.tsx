'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CreditsResponse = {
  used: number;
  limit: number | null;
  remaining: number | null;
  tier: string;
  periodEnd: string;
  label: string;
};

export function ContextCreditsBadge() {
  const [credits, setCredits] = useState<CreditsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/lookup/remaining')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CreditsResponse | null) => {
        if (!cancelled && data) setCredits(data);
      })
      .catch(() => {
        if (!cancelled) setCredits(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!credits || credits.limit == null) {
    return null;
  }

  const remaining = credits.remaining ?? 0;
  const low = remaining <= Math.max(5, Math.floor(credits.limit * 0.1));

  return (
    <div
      className="hidden md:flex flex-col items-end text-right leading-tight"
      title="Monthly context credits reset at the end of your billing period."
    >
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--ink-tertiary)' }}>
        {credits.label}
      </span>
      <span className="text-xs font-semibold" style={{ color: low ? 'var(--status-warn)' : 'var(--ink-secondary)' }}>
        {remaining} of {credits.limit} remaining
      </span>
      {low ? (
        <Link href="/#pricing" className="text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          Upgrade for more credits
        </Link>
      ) : null}
    </div>
  );
}
