'use client';

import Link from 'next/link';
import { signalCopy } from '@/lib/copy/signals';
import { RISK_TIER_COPY, type RiskTier } from '@/lib/copy/riskTiers';

interface RecommendedActionProps {
  tier: RiskTier;
  topSignalName?: string;
  runId?: string;
  customersHref?: string;
}

export default function RecommendedAction({ tier, topSignalName, runId, customersHref }: RecommendedActionProps) {
  const safeTier: RiskTier = tier === 'low' || tier === 'medium' || tier === 'high' || tier === 'critical'
    ? tier
    : 'low';
  const recommendation = topSignalName
    ? signalCopy(topSignalName).recommended
    : RISK_TIER_COPY[safeTier].default;

  if (safeTier === 'low') return null;

  return (
    <div
      className="border rounded-lg px-4 py-3 space-y-3"
      style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}
    >
      <div>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--risk-high)' }}
        >
          Recommended review
        </h3>
        <p className="text-sm" style={{ color: 'var(--risk-high)' }}>{recommendation}</p>
      </div>
      {(runId || customersHref) && (
        <div className="flex gap-3">
          {customersHref && (
            <Link
              href={customersHref}
              className="text-xs font-medium underline"
              style={{ color: 'var(--risk-high)' }}
            >
              Open customer profile &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
