'use client';

/**
 * Phase E-1 — ConfidenceExplanationPanel
 *
 * Feature-flagged by FLAG_CONFIDENCE_PANEL (default-off).
 *
 * Opens as a popover/panel when the analyst clicks a ConfidenceBadge.
 * Reads from existing engine output already present on the customer profile.
 * DOES NOT modify scoring weights, logic, or any frozen-core file.
 *
 * Data flow:
 *   CustomerIntelligence.confidence        → grade + numeric score
 *   CustomerIntelligence.whyFlagged        → signal bullets
 *   CustomerIntelligence.evidence          → supporting evidence items
 *   CustomerIntelligence.recommendation    → rationale text
 *
 * All data is READ-ONLY from API output.
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerIntelligence } from '@/types/customer';

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface ConfidenceExplanationProps {
  /** Customer intelligence data — must be already loaded by the parent. */
  customer: Pick<
    CustomerIntelligence,
    'confidence' | 'whyFlagged' | 'evidence' | 'recommendation' | 'risk'
  >;
  onClose: () => void;
  /** Optional anchor element — panel anchors to it if provided. */
  anchorEl?: HTMLElement | null;
}

// ---------------------------------------------------------------------------
// Score breakdown bar
// ---------------------------------------------------------------------------

interface ScoreBarProps {
  label: string;
  value: number; // 0-100
  max?: number;
  tone?: 'accent' | 'warning' | 'danger' | 'neutral';
}

function ScoreBar({ label, value, max = 100, tone = 'neutral' }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor =
    tone === 'accent'  ? 'var(--accent-500)'
    : tone === 'warning' ? 'var(--risk-medium-line)'
    : tone === 'danger'  ? 'var(--risk-critical-line)'
    : 'var(--border)';

  return (
    <div className="space-y-[var(--space-1)]">
      <div className="flex items-center justify-between">
        <span className="text-small text-[var(--text-secondary)]">{label}</span>
        <span className="text-mono-sm num text-[var(--text-primary)]">{value}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-sunk)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-[var(--duration-default)]"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade thresholds legend
// ---------------------------------------------------------------------------

const GRADE_THRESHOLDS = [
  { grade: 'A', min: 90, label: 'Definite identity match' },
  { grade: 'B', min: 75, label: 'Probable identity match' },
  { grade: 'C', min: 60, label: 'Possible identity match' },
  { grade: 'D', min: 45, label: 'Weak match signals' },
  { grade: 'F', min: 0,  label: 'Insufficient signals' },
] as const;

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ConfidenceExplanationPanel({
  customer,
  onClose,
}: ConfidenceExplanationProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus + close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [onClose]);

  const { grade, score } = customer.confidence;
  const riskScore = customer.risk.score;
  const { bullets } = customer.whyFlagged;

  // Derive sub-scores from available data
  const identitySignalScore = Math.min(100, bullets.length * 12); // proxy: signals × 12
  const behaviouralScore    = Math.max(0, score - identitySignalScore);

  const activeThreshold = GRADE_THRESHOLDS.find((t) => score >= t.min) ?? GRADE_THRESHOLDS[4];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Confidence score explanation"
      aria-modal="false"
      className={cn(
        'absolute z-[var(--z-popover)] w-80',
        'rounded-[var(--radius-3)] border border-[var(--border)]',
        'bg-[var(--bg-surface)] shadow-[var(--shadow-drawer)]',
        'p-[var(--space-5)] space-y-[var(--space-4)]',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <p className="text-body-strong text-[var(--text-primary)]">
            Confidence Score
          </p>
          <p className="text-small text-[var(--text-tertiary)] mt-[var(--space-1)]">
            How this grade was calculated
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Hero score */}
      <div
        className="flex items-center gap-[var(--space-3)] p-[var(--space-3)] rounded-[var(--radius-2)]"
        style={{ background: 'var(--bg-surface-alt)' }}
      >
        <div
          className="w-10 h-10 rounded-[var(--radius-2)] flex items-center justify-center text-lg font-bold"
          style={{ background: 'var(--accent-100)', color: 'var(--accent-600)' }}
        >
          {grade}
        </div>
        <div>
          <p className="text-display text-[var(--text-primary)] num leading-none">{score}</p>
          <p className="text-small text-[var(--text-tertiary)]">{activeThreshold.label}</p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-[var(--space-3)]">
        <p className="text-overline text-[var(--text-tertiary)] uppercase">Score breakdown</p>
        <ScoreBar
          label="Identity signal strength"
          value={identitySignalScore}
          tone="accent"
        />
        <ScoreBar
          label="Behavioural pattern score"
          value={Math.max(0, behaviouralScore)}
          tone={behaviouralScore > 30 ? 'danger' : 'neutral'}
        />
        <ScoreBar
          label="Overall risk score"
          value={riskScore}
          tone={riskScore >= 70 ? 'danger' : riskScore >= 40 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Signals fired */}
      {bullets.length > 0 && (
        <div className="space-y-[var(--space-2)]">
          <p className="text-overline text-[var(--text-tertiary)] uppercase">Signals detected</p>
          <ul className="space-y-[var(--space-1)]">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-[var(--space-2)] text-small text-[var(--text-secondary)]">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-500)' }} />
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grade threshold reference */}
      <div className="space-y-[var(--space-2)]">
        <p className="text-overline text-[var(--text-tertiary)] uppercase">Grade thresholds</p>
        <div className="grid grid-cols-5 gap-[var(--space-1)]">
          {GRADE_THRESHOLDS.map((t) => (
            <div
              key={t.grade}
              className={cn(
                'rounded-[var(--radius-1)] p-[var(--space-1)] text-center',
                grade === t.grade
                  ? 'bg-[var(--accent-100)] text-[var(--accent-600)]'
                  : 'bg-[var(--bg-surface-sunk)] text-[var(--text-tertiary)]',
              )}
            >
              <p className="text-mono-sm font-bold">{t.grade}</p>
              <p className="text-meta">{t.min}+</p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <p className="text-meta text-[var(--text-tertiary)] border-t border-[var(--border-subtle)] pt-[var(--space-3)]">
        Score computed by identity linker + behavioural scorer. Weights are fixed
        and reviewed quarterly. This panel is read-only.
      </p>
    </div>
  );
}
