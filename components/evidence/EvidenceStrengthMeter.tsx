'use client';

/**
 * EvidenceStrengthMeter
 * 5-segment visualisation using --evidence-{weak,moderate,strong}-* CSS tokens
 * (Phase A aliases defined in globals.css).
 *
 * Static display; no interaction. Fade-in via the existing animation system.
 */

interface EvidenceStrengthMeterProps {
  strength: 'weak' | 'moderate' | 'strong';
  label: string;
}

const LEVELS = ['weak', 'weak', 'moderate', 'strong', 'strong'] as const;

const STRENGTH_ORDER: Record<EvidenceStrengthMeterProps['strength'], number> = {
  weak: 2,
  moderate: 3,
  strong: 5,
};

const STRENGTH_LABEL: Record<EvidenceStrengthMeterProps['strength'], string> = {
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong',
};

export function EvidenceStrengthMeter({ strength, label }: EvidenceStrengthMeterProps) {
  const activeLevel = STRENGTH_ORDER[strength];

  return (
    <div
      className="border p-3 animate-fade-in"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', borderRadius: 4 }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-xs font-medium tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{
            background: `var(--evidence-${strength}-bg)`,
            color: `var(--evidence-${strength}-fg)`,
            border: `1px solid var(--evidence-${strength}-line)`,
          }}
        >
          {STRENGTH_LABEL[strength]}
        </span>
      </div>

      <div className="flex items-end gap-1.5" role="img" aria-label={`Evidence strength: ${STRENGTH_LABEL[strength]}`}>
        {LEVELS.map((level, i) => {
          const isActive = i < activeLevel;
          const barStrength = level;
          return (
            <div
              key={`${level}-${i}`}
              className="flex-1 rounded-sm transition-colors"
              style={{
                height: 10,
                background: isActive
                  ? `var(--evidence-${barStrength}-line)`
                  : 'var(--bg-subtle)',
                border: isActive
                  ? `1px solid var(--evidence-${barStrength}-line)`
                  : '1px solid var(--border-subtle)',
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
        {STRENGTH_LABEL[strength]}
      </div>
    </div>
  );
}
