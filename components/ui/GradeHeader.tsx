import type { ConfidenceGradeValue } from '@/lib/confidence';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';

interface GradeHeaderProps {
  grade: ConfidenceGradeValue;
  label: string;
  supportingText?: string;
}

export function GradeHeader({ grade, label, supportingText }: GradeHeaderProps) {
  const tone = letterGradeTone(grade);

  return (
    <div className="flex items-center gap-4">
      <div
        style={{
          background: tone.fill,
          color: tone.fg,
          borderRadius: 'var(--radius-md)',
          border: `2px solid ${tone.fg}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {grade}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.85, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {tone.label}
        </span>
      </div>
      <div>
        <p className="font-semibold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
          {label}
        </p>
        {supportingText && (
          <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
            {supportingText}
          </p>
        )}
      </div>
    </div>
  );
}
