import type { ReactNode } from 'react';

export function ScopeStrip({ primary, utility }: { primary?: ReactNode; utility?: ReactNode }) {
  return (
    <>
      <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: 8 }}>{primary}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>{utility}</div>
    </>
  );
}
