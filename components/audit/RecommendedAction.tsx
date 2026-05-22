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
  const interpretation = topSignalName
    ? signalCopy(topSignalName).recommended
    : RISK_TIER_COPY[safeTier].default;

  if (safeTier === 'low') return null;

  const isCritical = safeTier === 'critical';

  return (
    <div
      style={{
        background: isCritical ? 'var(--sev-definite-fill)' : 'var(--sev-probable-fill)',
        border: `1px solid ${isCritical ? 'color-mix(in srgb, var(--sev-definite) 40%, transparent)' : 'color-mix(in srgb, var(--sev-probable) 40%, transparent)'}`,
        borderLeft: `3px solid ${isCritical ? 'var(--sev-definite)' : 'var(--sev-probable)'}`,
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
          background: isCritical ? 'var(--sev-definite)' : 'var(--sev-probable)',
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
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: isCritical ? 'var(--sev-definite)' : 'var(--sev-probable)',
            marginBottom: 4,
            lineHeight: 1,
          }}
        >
          Evidence interpretation
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--ink-secondary)',
            lineHeight: 1.5,
          }}
        >
          {interpretation}
        </p>
        {customersHref && (
          <Link
            href={customersHref}
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 11,
              fontWeight: 600,
              color: isCritical ? 'var(--sev-definite)' : 'var(--sev-probable)',
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
