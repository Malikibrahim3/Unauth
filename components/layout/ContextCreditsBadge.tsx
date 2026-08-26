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

  // Context is an implementation detail until it needs an operator action.
  // Keeping a healthy quota out of the global header reduces ambient anxiety
  // and preserves the signal for the moment it matters.
  if (!low && !warn) return null;

  return (
    <Link
      href="/settings/billing"
      prefetch={false}
      className="hidden md:flex flex-col items-end text-right leading-tight"
      title="Context credits are used each time Unauth assembles claim context from your connected sources. They reset at the end of your billing period — click to manage in Billing."
    >
      <span className="text-[length:var(--uo-route-text-metadata-size)] font-medium" style={{ color: 'var(--uo-route-text-tertiary)' }}>
        Context usage
      </span>
      <span
        className="ua-text-label"
        style={{ color: low || warn ? 'var(--uo-route-warning)' : 'var(--uo-route-text-secondary)' }}
      >
        {remaining} of {limit} remaining
      </span>
      {warn || low ? (
        <span className="ua-text-label hover:underline" style={{ color: 'var(--uo-route-action-primary)' }}>
          {low ? 'Upgrade or top up' : 'Review usage'}
        </span>
      ) : null}
    </Link>
  );
}
