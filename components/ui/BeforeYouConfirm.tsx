import type { CSSProperties, ReactNode } from 'react';

export interface BeforeYouConfirmProps {
  objectSummary: ReactNode;
  valueSummary: ReactNode;
  externalAction: ReactNode;
  reversible: ReactNode;
  appendOnly: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const rows = ['objectSummary', 'valueSummary', 'externalAction', 'reversible', 'appendOnly'] as const;
type BeforeYouConfirmRow = (typeof rows)[number];

const labels: Record<BeforeYouConfirmRow, string> = {
  objectSummary: 'Object',
  valueSummary: 'Value',
  externalAction: 'External action',
  reversible: 'Reversible',
  appendOnly: 'Appends',
};

/** Shared consequence review block for irreversible or externally visible actions. */
export function BeforeYouConfirm({
  objectSummary,
  valueSummary,
  externalAction,
  reversible,
  appendOnly,
  children,
  className: _className,
  style,
}: BeforeYouConfirmProps) {
  const values: Record<BeforeYouConfirmRow, ReactNode> = {
    objectSummary,
    valueSummary,
    externalAction,
    reversible,
    appendOnly,
  };

  return (
    <aside style={{ overflow: 'hidden', border: '1px solid #e8d7c9', borderRadius: 12, background: '#fff3e9', ...style }} aria-label="Before you confirm">
      <div style={{ borderBottom: '1px solid #eadfd5', padding: '12px 16px', color: '#1c1f23', fontWeight: 600 }}>
        <h3 style={{ margin: 0, fontSize: 12 }}>Before you confirm</h3>
      </div>
      <dl style={{ margin: 0 }}>
        {rows.map((row) => (
          <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12, padding: '10px 16px', borderTop: row === rows[0] ? 0 : '1px solid #eadfd5' }} key={row}>
            <dt style={{ color: '#6f6a63', fontSize: 10 }}>{labels[row]}</dt>
            <dd style={{ margin: 0, color: '#40454a', fontSize: 11 }}>{values[row]}</dd>
          </div>
        ))}
      </dl>
      {children ? <div style={{ borderTop: '1px solid #eadfd5', padding: '12px 16px', color: '#64686d', fontSize: 11, lineHeight: 1.45 }}>{children}</div> : null}
    </aside>
  );
}
