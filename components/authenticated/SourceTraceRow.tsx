import type { ReactNode } from 'react';

export function SourceTraceRow({ kind, summary, meta }: { kind: ReactNode; summary: ReactNode; meta?: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0,1fr) auto', alignItems: 'baseline', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}>
      <div style={{ color: '#6f6a63', font: "400 10px/1.4 'IBM Plex Mono',monospace", textTransform: 'uppercase' }}>{kind}</div>
      <div style={{ color: '#1c1f23', font: "400 11.5px/1.45 'Inter',sans-serif" }}>{summary}</div>
      {meta ? <div style={{ color: '#6f6a63', font: "400 10px/1.3 'IBM Plex Mono',monospace" }}>{meta}</div> : null}
    </div>
  );
}
