'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard } from './SectionCard';
import { EvidenceList } from './EvidenceList';
import { ConfidenceBadge, type ConfidenceGradeValue } from './ConfidenceBadge';
import { Button } from './Button';
import type { SignalType, SignalStrength } from './SignalBadge';

export type RecommendedActionKey =
  | 'block'
  | 'watch'
  | 'review'
  | 'allow'
  | 'request_evidence';

interface EvidenceItem {
  id: string;
  signalType: SignalType;
  strength: SignalStrength;
  headline: string;
  detail: string;
  metadata?: { label: string; value: string }[];
  contradicts?: boolean;
}

interface FalsePositiveRisk {
  level: 'low' | 'medium' | 'high';
  explanation: string;
  contradictingEvidence?: EvidenceItem[];
}

interface RecommendedActionCardProps {
  action: RecommendedActionKey;
  confidence: ConfidenceGradeValue;
  rationale: string;
  supportingEvidence?: EvidenceItem[];
  falsePositiveRisk: FalsePositiveRisk;
  onPrimaryAction?: () => void;
  onMarkSafe?: () => void;
  className?: string;
}

const ACTION_LABELS: Record<RecommendedActionKey, string> = {
  block:            'Block this customer',
  watch:            'Add to watchlist',
  review:           'Review manually',
  allow:            'Allow — no action needed',
  request_evidence: 'Request evidence from customer',
};

const ACTION_BUTTON_LABELS: Record<RecommendedActionKey, string> = {
  block:            'Block customer',
  watch:            'Add to watchlist',
  review:           'Mark for review',
  allow:            'Mark as safe',
  request_evidence: 'Request evidence',
};

const FP_LEVEL_BADGE: Record<FalsePositiveRisk['level'], { text: string; color: string }> = {
  low:    { text: 'Low FP risk',    color: 'text-[var(--risk-low-fg)]' },
  medium: { text: 'Moderate FP risk', color: 'text-[var(--risk-medium-fg)]' },
  high:   { text: 'High FP risk',   color: 'text-[var(--risk-critical-fg)]' },
};

export function RecommendedActionCard({
  action,
  confidence,
  rationale,
  supportingEvidence = [],
  falsePositiveRisk,
  onPrimaryAction,
  onMarkSafe,
  className,
}: RecommendedActionCardProps) {
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [altExpanded, setAltExpanded] = useState(false);

  const fpBadge = FP_LEVEL_BADGE[falsePositiveRisk.level];

  return (
    <SectionCard
      title=""
      className={cn('overflow-hidden', className)}
    >
      {/* Override: no standard header — this card has its own layout */}
      <div className="-mx-[var(--space-5)] -mt-[var(--space-5)]">
        {/* Label row */}
        <div className="flex items-center justify-between px-[var(--space-5)] pt-[var(--space-5)] pb-[var(--space-3)]">
          <span className="text-overline text-[var(--text-tertiary)]">Recommended action</span>
          <ConfidenceBadge grade={confidence} size="sm" />
        </div>

        {/* Action statement */}
        <div className="px-[var(--space-5)] pb-[var(--space-3)]">
          <p className="text-h1 text-[var(--text-primary)]">{ACTION_LABELS[action]}</p>
        </div>

        {/* Rationale */}
        <div className="px-[var(--space-5)] pb-[var(--space-4)]">
          <p className="text-body text-[var(--text-secondary)]">{rationale}</p>
        </div>

        {/* Why disclosure */}
        {supportingEvidence.length > 0 && (
          <div className="border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setWhyExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-[var(--space-5)] py-[var(--space-3)] text-small text-[var(--text-link)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-expanded={whyExpanded}
            >
              <span>Why this recommendation</span>
              <span aria-hidden="true">{whyExpanded ? '↑' : '↓'}</span>
            </button>
            {whyExpanded && (
              <EvidenceList
                items={supportingEvidence.slice(0, 3)}
                className="border-t border-[var(--border-subtle)]"
              />
            )}
          </div>
        )}

        {/* Action row */}
        <div className="px-[var(--space-5)] py-[var(--space-4)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-[var(--space-3)]">
          <button
            type="button"
            onClick={() => setAltExpanded((v) => !v)}
            className="text-small text-[var(--text-link)] hover:underline shrink-0"
            aria-expanded={altExpanded}
          >
            See alternative interpretation
          </button>
          <Button variant="primary" size="sm" onClick={onPrimaryAction}>
            {ACTION_BUTTON_LABELS[action]}
          </Button>
        </div>

        {/* Alternative interpretation */}
        {altExpanded && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--info-bg)] px-[var(--space-5)] py-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-3)]">
              <span className={cn('text-small font-semibold', fpBadge.color)}>{fpBadge.text}</span>
            </div>
            <p className="text-small text-[var(--text-secondary)]">{falsePositiveRisk.explanation}</p>
            {(falsePositiveRisk.contradictingEvidence ?? []).length > 0 && (
              <EvidenceList
                items={falsePositiveRisk.contradictingEvidence!}
                className="mt-[var(--space-3)] -mx-0 border border-[var(--info-line)] rounded-[var(--radius-2)]"
              />
            )}
            {onMarkSafe && (
              <Button variant="secondary" size="sm" className="mt-[var(--space-4)]" onClick={onMarkSafe}>
                Mark as safe — not a fraudster
              </Button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
