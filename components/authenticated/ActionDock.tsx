import type { ReactNode } from 'react';

export function ActionDock({ copy, actions, sticky = false }: { copy?: ReactNode; actions: ReactNode; sticky?: boolean }) {
  return (
    <div data-sticky={sticky || undefined} style={{ position: sticky ? 'sticky' : 'relative', bottom: sticky ? 12 : undefined, zIndex: sticky ? 5 : undefined, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10, background: '#fff', boxShadow: '0 8px 24px rgba(28,27,25,.12),0 0 0 1px rgba(28,27,25,.08)' }}>
      {copy ? <div style={{ flex: 1, minWidth: 0, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{copy}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>
    </div>
  );
}
