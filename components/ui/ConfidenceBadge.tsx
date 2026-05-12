'use client';

import { useState, useRef } from 'react';
import { Badge } from './Badge';
import { FLAG_CONFIDENCE_PANEL } from '@/lib/flags';
import type { CustomerIntelligence } from '@/types/customer';

// Lazy-load the panel so non-flag paths pay zero cost
import dynamic from 'next/dynamic';
const ConfidenceExplanationPanel = dynamic(
  () => import('./ConfidenceExplanationPanel').then((m) => m.ConfidenceExplanationPanel),
  { ssr: false },
);

export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  score?: number;
  size?: 'sm' | 'md';
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
  A: 'success',
  B: 'success',
  C: 'warning',
  D: 'danger',
  F: 'critical',
} as const;

const GRADE_LABEL = {
  A: 'Grade A — definite identity match',
  B: 'Grade B — probable identity match',
  C: 'Grade C — possible identity match',
  D: 'Grade D — weak match signals',
  F: 'Grade F — insufficient signals',
} as const;

export function ConfidenceBadge({ grade, score, size = 'md', customerIntelligence }: ConfidenceBadgeProps) {
  const tone = GRADE_TONE[grade] ?? 'neutral';
  const title = score != null
    ? `Confidence grade ${grade} — ${score}/100. ${GRADE_LABEL[grade]}`
    : GRADE_LABEL[grade];

  const [panelOpen, setPanelOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const panelEnabled = FLAG_CONFIDENCE_PANEL && !!customerIntelligence;

  const badge = (
    <Badge tone={tone as 'success' | 'warning' | 'danger' | 'critical'} variant="subtle" size={size}>
      <span
        title={panelEnabled ? undefined : title}
        className="font-semibold num"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {grade}
        {score != null && (
          <span className="ml-1 opacity-70 text-mono-sm">· {score}</span>
        )}
      </span>
    </Badge>
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

/** Maps A–F grade from a numeric 0–100 score */
export function scoreToGrade(score: number): ConfidenceGradeValue {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Maps legacy risk level strings to identity match confidence grades (A–F) */
export function riskLevelToNewGrade(level: string | null | undefined): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'F';
    case 'high':     return 'D';
    case 'medium':   return 'C';
    case 'low':      return 'B';
    default:         return 'C';
  }
}
