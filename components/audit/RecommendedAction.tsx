'use client';

import Link from 'next/link';
import { signalLabel } from '@/lib/copy/signalLabels';
import { RISK_TIER_COPY, type RiskTier } from '@/lib/copy/riskTiers';

interface RecommendedActionProps {
  tier: RiskTier;
  topSignalName?: string;
  runId?: string;
  customersHref?: string;
}

export default function RecommendedAction({ tier, topSignalName, runId, customersHref }: RecommendedActionProps) {
  const recommendation = topSignalName
    ? signalLabel(topSignalName).recommended
    : RISK_TIER_COPY[tier].default;

  if (tier === 'low') return null;

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
          Recommended action
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
