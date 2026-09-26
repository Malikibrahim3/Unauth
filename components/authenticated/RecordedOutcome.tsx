import type { ReactNode } from 'react';

export function RecordedOutcome({ children, meta, urgent = false }: { children: ReactNode; meta?: ReactNode; urgent?: boolean }) {
  return (
    <div role={urgent ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 12px', borderRadius: 9, background: urgent ? '#fdf0e6' : '#f4f3f1', color: urgent ? '#b0431a' : '#1c1f23', font: "500 11.5px/1.4 'Inter',sans-serif" }}>
      <div>{children}</div>
      {meta ? <div style={{ marginLeft: 'auto', color: '#6f6a63', font: "400 10px/1.3 'IBM Plex Mono',monospace" }}>{meta}</div> : null}
    </div>
  );
}
