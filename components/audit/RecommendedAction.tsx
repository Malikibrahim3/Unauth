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

  const isCritical = safeTier === 'critical';

  return (
    <div
      style={{
        background: isCritical ? '#1A1814' : '#FBEFEC',
        border: `1px solid ${isCritical ? '#1A1814' : '#F0C8BE'}`,
        borderRadius: 4,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isCritical ? '#E8E4D8' : '#7B2D26',
          flexShrink: 0,
          marginTop: 3,
        }}
        aria-hidden="true"
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isCritical ? '#E8E4D8' : '#7B2D26',
            marginBottom: 4,
            lineHeight: 1,
          }}
        >
          Recommended action
        </div>
        <p
          style={{
            fontSize: 12,
            color: isCritical ? '#C8C4BA' : '#7B2D26',
            lineHeight: 1.5,
          }}
        >
          {recommendation}
        </p>
        {customersHref && (
          <Link
            href={customersHref}
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 11,
              fontWeight: 600,
              color: isCritical ? '#E8E4D8' : '#7B2D26',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Open customer profile →
          </Link>
        )}
      </div>
    </div>
  );
}
