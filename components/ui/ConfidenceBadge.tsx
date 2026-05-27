'use client';

import { useState, useRef } from 'react';
import { FLAG_CONFIDENCE_PANEL } from '@/lib/flags';
import { CONFIDENCE_GRADE_COPY, type ConfidenceGradeValue } from '@/lib/confidence';
import type { CustomerIntelligence } from '@/types/customer';

// Lazy-load the panel so non-flag paths pay zero cost
import dynamic from 'next/dynamic';
const ConfidenceExplanationPanel = dynamic(
  () => import('./ConfidenceExplanationPanel').then((m) => m.ConfidenceExplanationPanel),
  { ssr: false },
);

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  score?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  /**
   * Phase E-1: supply customer intelligence data to enable the clickable
   * ConfidenceExplanationPanel (only rendered when FLAG_CONFIDENCE_PANEL=true).
   */
  customerIntelligence?: Pick<
    CustomerIntelligence,
    'confidence' | 'whyFlagged' | 'evidence' | 'recommendation' | 'risk'
  >;
}

const GRADE_TONE = {
  A: {
    fg: 'var(--sev-definite)',
    fill: 'var(--sev-definite-fill)',
    label: 'Definite',
    dashed: false,
  },
  B: {
    fg: 'var(--sev-probable)',
    fill: 'var(--sev-probable-fill)',
    label: 'Probable',
    dashed: false,
  },
  C: {
    fg: 'var(--sev-neutral)',
    fill: 'var(--sev-neutral-fill)',
    label: 'Possible',
    dashed: false,
  },
  D: {
    fg: 'color-mix(in srgb, var(--sev-neutral) 60%, transparent)',
    fill: 'var(--sev-neutral-fill)',
    label: 'Weak',
    dashed: true,
  },
  F: {
    fg: 'var(--ink-tertiary)',
    fill: 'var(--surface-muted)',
    label: 'Weak',
    dashed: true,
  },
} as const;

const GRADE_LABEL = {
  A: 'Grade A — definite identity match',
  B: 'Grade B — probable identity match',
  C: 'Grade C — possible identity match',
  D: 'Grade D — weak match signals',
  F: 'Grade F — insufficient signals',
} as const;

export function ConfidenceBadge({
  grade,
  score,
  size = 'md',
  showLabel = true,
  customerIntelligence,
}: ConfidenceBadgeProps) {
  const tone = GRADE_TONE[grade] ?? GRADE_TONE.F;
  const copy = CONFIDENCE_GRADE_COPY[grade];
  const title = score != null
    ? `Confidence grade ${grade} — ${score}/100. ${GRADE_LABEL[grade]}`
    : GRADE_LABEL[grade];

  const [panelOpen, setPanelOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const panelEnabled = FLAG_CONFIDENCE_PANEL && !!customerIntelligence;

  const compact = size === 'sm' || !showLabel;
  const label = tone.label;
  const badge = (
    <span
      title={panelEnabled ? undefined : title}
      className="inline-flex items-center overflow-hidden font-mono tabular-nums"
      style={{
        width: compact ? 20 : score != null ? 112 : 96,
        height: compact ? 20 : 22,
        borderRadius: 'var(--radius-sm)',
        background: tone.fill,
        color: tone.fg,
        border: `1px ${tone.dashed ? 'dashed' : 'solid'} color-mix(in srgb, ${tone.fg} 40%, transparent)`,
        borderLeft: `3px solid ${tone.fg}`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone.fg} 18%, transparent)`,
      }}
    >
      <span
        className="flex h-full items-center justify-center font-semibold"
        style={{
          width: compact ? 17 : 24,
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {grade}
      </span>
      {!compact && (
        <>
          <span
            className="flex-1 truncate font-sans"
            style={{
              color: 'var(--ink-secondary)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}
          >
            {label}
          </span>
          {score != null && (
            <span
              className="px-1 text-right"
              style={{
                minWidth: 28,
                color: tone.fg,
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {score}
            </span>
          )}
        </>
      )}
    </span>
  );

  if (!panelEnabled) return badge;

  return (
    <span className="relative inline-flex">
      <button
        ref={anchorRef}
        aria-label={`${title}. Click to see score breakdown.`}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
        onClick={() => setPanelOpen((v) => !v)}
        className="cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        {badge}
      </button>
      {panelOpen && customerIntelligence && (
        <div className="absolute top-full left-0 mt-[var(--space-2)] z-[var(--z-popover)]">
          <ConfidenceExplanationPanel
            customer={customerIntelligence}
            onClose={() => setPanelOpen(false)}
            anchorEl={anchorRef.current}
          />
        </div>
      )}
    </span>
  );
}

export type { ConfidenceGradeValue };
