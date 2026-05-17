'use client';

interface KbdHintProps {
  pairs: Array<[string, string]>;
}

export function KbdHint({ pairs }: KbdHintProps) {
  if (!pairs.length) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ color: 'var(--text-muted)' }}
    >
      {pairs.map(([key, label]) => (
        <span
          key={`${key}-${label}`}
          className="inline-flex items-center gap-1.5"
          style={{
            height: 18,
            padding: '0 7px',
            borderRadius: 3,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-canvas)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: '#1A1814', fontFamily: 'var(--font-mono)' }}>{key}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
