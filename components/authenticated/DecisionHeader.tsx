import type { ReactNode } from 'react';

export function DecisionHeader({
  title,
  sentence,
  meta,
  actions,
  scope,
}: {
  title: string;
  sentence?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  scope?: ReactNode;
}) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'start', gap: 14, padding: '14px 16px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, color: '#1c1f23', font: "500 18px/1.25 'Inter',sans-serif", letterSpacing: '-.015em' }}>{title}</h1>
        {sentence ? <div style={{ marginTop: 5 }}>{sentence}</div> : null}
        {meta ? <div style={{ marginTop: 7, color: '#6f6a63', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{meta}</div> : null}
      </div>
      {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div> : null}
      {scope ? <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid #eae8e5' }}>{scope}</div> : null}
    </header>
  );
}
