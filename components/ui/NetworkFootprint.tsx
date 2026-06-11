'use client';

import { cn } from '@/lib/utils';
import { GradeBadge, type ConfidenceGradeValue } from '@/components/ui/GradeBadge';

const GRADE_LABEL: Record<ConfidenceGradeValue, string> = {
  A: 'Definite',
  B: 'Probable',
  C: 'Possible',
  D: 'Weak',
  F: 'None',
};

interface NetworkFootprintProps {
  merchants: number;
  claims: number;
  grade: 'A' | 'B' | 'C' | 'D' | null;
  kSatisfied: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

interface CellProps {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  compact?: boolean;
}

function Cell({ label, children, last = false, compact = false }: CellProps) {
  return (
    <div
      className="flex flex-col flex-1 min-w-0"
      style={
        last
          ? undefined
          : {
              borderRight: '1px solid var(--border-muted)',
              paddingRight: compact ? '8px' : '12px',
              marginRight: compact ? '8px' : '12px',
            }
      }
    >
      <span
        className="text-overline"
        style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}
      >
        {label}
      </span>
      <span
        className={compact ? 'text-mono-sm' : 'text-mono-md'}
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </span>
    </div>
  );
}

export function NetworkFootprint({
  merchants,
  claims,
  grade,
  kSatisfied,
  variant = 'default',
  className,
}: NetworkFootprintProps) {
  const compact = variant === 'compact';

  const gradeLabel = grade ? GRADE_LABEL[grade as ConfidenceGradeValue] ?? '' : '—';

  return (
    <div
      className={cn('flex flex-col', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-md)',
        padding: compact
          ? '8px 10px'
          : 'var(--space-3, 12px) var(--space-4, 16px)',
      }}
    >
      {/* Cells row */}
      <div className="flex flex-row items-start">
        <Cell label="MERCHANTS" compact={compact}>
          {merchants}
        </Cell>

        <Cell label="CLAIMS" compact={compact}>
          {claims}
        </Cell>

        <Cell label="MATCH GRADE" compact={compact}>
          {grade ? (
            <span className="inline-flex items-center gap-1">
              <GradeBadge grade={grade as ConfidenceGradeValue} size="sm" />
              <span style={{ color: 'var(--text-secondary)' }}>
                {gradeLabel}
              </span>
            </span>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
          )}
        </Cell>

        <Cell label="PRIVACY" last compact={compact}>
          {kSatisfied ? (
            <span
              className="inline-flex items-center gap-1 rounded"
              style={{
                color: 'var(--privacy-ink)',
                background: 'var(--privacy-fill)',
                padding: '1px 6px',
                fontSize: '0.7rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              k≥3 ✓
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded"
              style={{
                color: 'var(--text-tertiary)',
                background: 'var(--surface-sunken)',
                padding: '1px 6px',
                fontSize: '0.7rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              k&lt;3
            </span>
          )}
        </Cell>
      </div>

      {/* Fixed footer */}
      <p
        className="text-meta"
        style={{
          color: 'var(--text-tertiary)',
          marginTop: compact ? '8px' : '10px',
          marginBottom: 0,
        }}
      >
        No automated decision issued — evidence for agent review.
      </p>
    </div>
  );
}
