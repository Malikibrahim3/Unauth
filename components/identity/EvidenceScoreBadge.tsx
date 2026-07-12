'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import type { EvidenceLevel, ScoreFactor } from '@/lib/engine/evidence/score';
import type { ConfidenceGrade } from '@/lib/engine/weights';

export type EvidenceScoreBadgeProps = {
  evidence_score: number;
  evidence_level: EvidenceLevel;
  has_sufficient_data: boolean;
  score_breakdown: ScoreFactor[];
  confidence_grade: ConfidenceGrade | null;
  /** When false, network k-anonymity withheld the score (not a real zero). */
  evidence_disclosed?: boolean;
};

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  minimal: 'Minimal',
  some: 'Some',
  substantial: 'Substantial',
  extensive: 'Extensive',
};

export const EVIDENCE_LEVEL_TONES: Record<EvidenceLevel, { fg: string; fill: string }> = {
  minimal: { fg: 'var(--text-tertiary)', fill: 'var(--surface-sunken)' },
  some: { fg: 'var(--warning)', fill: 'var(--sev-probable-fill)' },
  substantial: { fg: 'var(--sev-probable)', fill: 'var(--sev-probable-fill)' },
  extensive: { fg: 'var(--sev-definite)', fill: 'var(--sev-definite-fill)' },
};

const WEAK_CONFIDENCE_CAVEAT = 'Identity match confidence is weak — treat with extra caution.';

export function evidenceSummaryText(props: Pick<
  EvidenceScoreBadgeProps,
  'evidence_disclosed' | 'evidence_score' | 'evidence_level' | 'has_sufficient_data' | 'confidence_grade'
>): string {
  if (props.evidence_disclosed === false) {
    return 'Not enough network coverage to share';
  }
  if (!props.has_sufficient_data) {
    return 'Not enough evidence yet';
  }
  const level = EVIDENCE_LEVEL_LABELS[props.evidence_level];
  return `Evidence: ${props.evidence_score} · ${level}`;
}

export function formatEvidenceBreakdownText(
  props: Pick<EvidenceScoreBadgeProps, 'evidence_disclosed' | 'has_sufficient_data' | 'score_breakdown'>,
): string {
  if (props.evidence_disclosed === false) {
    return 'Network evidence is not shared below the coverage threshold.';
  }
  if (!props.has_sufficient_data || props.score_breakdown.length === 0) {
    return 'Not enough evidence for a score breakdown.';
  }
  return props.score_breakdown.map((f) => `${f.label} ${f.points}/${f.max_points}`).join(' · ');
}

export function EvidenceScoreBadge({
  evidence_score,
  evidence_level,
  has_sufficient_data,
  score_breakdown,
  confidence_grade,
  evidence_disclosed = true,
}: EvidenceScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const disclosed = evidence_disclosed !== false;
  const sufficient = disclosed && has_sufficient_data;
  const levelTone = EVIDENCE_LEVEL_TONES[evidence_level];
  const summary = evidenceSummaryText({
    evidence_disclosed,
    evidence_score,
    evidence_level,
    has_sufficient_data,
    confidence_grade,
  });
  const breakdownText = formatEvidenceBreakdownText({
    evidence_disclosed,
    has_sufficient_data,
    score_breakdown,
  });
  const showWeakCaveat = confidence_grade === 'weak';

  return (
    <div
      className="rounded-md border"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
        aria-expanded={expanded}
      >
        <div className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {expanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Evidence score
            </span>
            {confidence_grade && (
              <GradeBadge
                grade={riskLevelToNewGrade(confidence_grade)}
                size="sm"
                showLabel
                compact
                title="Identity match confidence (separate from evidence score)"
              />
            )}
          </div>
          {sufficient ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>
                {evidence_score}
              </span>
              <span
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold"
                style={{ color: levelTone.fg, background: levelTone.fill, borderColor: `color-mix(in srgb, ${levelTone.fg} 25%, transparent)` }}
              >
                {EVIDENCE_LEVEL_LABELS[evidence_level]}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-body-sm" style={{ color: 'var(--text-primary)' }}>
              {summary}
            </p>
          )}
          {showWeakCaveat && (
            <p className="mt-2 text-caption" style={{ color: 'var(--text-secondary)' }}>
              {WEAK_CONFIDENCE_CAVEAT}
            </p>
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
          <p className="text-caption font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Score breakdown
          </p>
          {sufficient && score_breakdown.length > 0 ? (
            <ul className="space-y-2">
              {score_breakdown.map((factor) => (
                <li key={factor.factor} className="flex items-start justify-between gap-3 text-caption">
                  <span style={{ color: 'var(--text-primary)' }}>{factor.label}</span>
                  <span className="font-mono shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {factor.points}/{factor.max_points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
              {breakdownText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
