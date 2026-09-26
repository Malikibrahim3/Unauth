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
      <span className="text-[length:10.5px] font-medium" style={{ color: '#6f6a63' }}>
        Context usage
      </span>
      <span
        className="text-[11px] font-medium leading-4 text-[#64686d]"
        style={{ color: low || warn ? '#7a5310' : '#64686d' }}
      >
        {remaining} of {limit} remaining
      </span>
      {warn || low ? (
        <span className="text-[11px] font-medium leading-4 text-[#64686d] hover:underline" style={{ color: '#9f4f08' }}>
          {low ? 'Upgrade or top up' : 'Review usage'}
        </span>
      ) : null}
    </Link>
  );
}
