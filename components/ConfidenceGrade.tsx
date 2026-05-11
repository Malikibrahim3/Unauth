import React from 'react';

export type ConfidenceGradeValue = 'definite' | 'probable' | 'possible' | 'weak';

interface ConfidenceGradeProps {
  grade: ConfidenceGradeValue;
  size?: 'sm' | 'md';
  showDot?: boolean;
  /** When true, renders a secondary "Disputed" badge alongside the grade. */
  falsePositiveReported?: boolean;
}

const GRADE_CONFIG: Record<
  ConfidenceGradeValue,
  { dot: string; bg: string; label: string; text: string }
> = {
  definite: {
    dot:   'var(--risk-critical)',
    bg:    'rgba(229, 72, 77, 0.12)',
    label: 'LINKED',
    text:  'var(--risk-critical)',
  },
  probable: {
    dot:   'var(--risk-high)',
    bg:    'rgba(241, 161, 13, 0.12)',
    label: 'PROBABLE',
    text:  'var(--risk-high)',
  },
  possible: {
    dot:   'var(--risk-medium)',
    bg:    'rgba(255, 230, 41, 0.12)',
    label: 'SIGNAL',
    text:  'var(--risk-medium)',
  },
  weak: {
    dot:   'var(--risk-none)',
    bg:    'rgba(113, 113, 122, 0.12)',
    label: 'WEAK',
    text:  'var(--risk-none)',
  },
};

/** Maps legacy risk_level / risk_tier values to ConfidenceGradeValue */
export function riskLevelToGrade(
  level: string | null | undefined
): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'definite';
    case 'high':     return 'probable';
    case 'medium':   return 'possible';
    default:         return 'weak';
  }
}

export default function ConfidenceGrade({
  grade,
  size = 'md',
  showDot = true,
  falsePositiveReported = false,
}: ConfidenceGradeProps) {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG.weak;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            '6px',
          padding:        '4px 8px',
          borderRadius:   '4px',
          background:     cfg.bg,
          fontSize:       `${fontSize}px`,
          fontWeight:     500,
          letterSpacing:  '0.05em',
          textTransform:  'uppercase',
          color:          cfg.text,
          lineHeight:     1,
        }}
      >
        {showDot && (
          <span
            aria-hidden="true"
            style={{
              display:      'inline-block',
              width:        '6px',
              height:       '6px',
              borderRadius: '50%',
              background:   cfg.dot,
              flexShrink:   0,
            }}
          />
        )}
        {cfg.label}
      </span>
      {falsePositiveReported && (
        <span
          title="Flagged as possible false positive — under review"
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            padding:       '4px 6px',
            borderRadius:  '4px',
            background:    'rgba(113, 113, 122, 0.10)',
            fontSize:      `${fontSize}px`,
            fontWeight:    500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color:         'var(--risk-none)',
            lineHeight:    1,
          }}
        >
          Disputed
        </span>
      )}
    </span>
  );
}
