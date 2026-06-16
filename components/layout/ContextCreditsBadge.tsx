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
  const used = credits.used ?? 0;
  const limit = credits.limit ?? 0;
  const usageRatio = limit > 0 ? used / limit : 0;
  const low = remaining <= Math.max(5, Math.floor(limit * 0.1));
  const warn = usageRatio >= 0.8 && remaining > 0;

  return (
    <div
      className="hidden md:flex flex-col items-end text-right leading-tight"
      title="Monthly context credits reset at the end of your billing period."
    >
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
        {credits.label}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: low || warn ? 'var(--warning)' : 'var(--text-secondary)' }}
      >
        {remaining} of {limit} remaining
      </span>
      {warn || low ? (
        <Link href="/settings/billing" className="text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          {low ? 'Upgrade or top up' : 'Top up or upgrade'}
        </Link>
      ) : null}
    </div>
  );
}
