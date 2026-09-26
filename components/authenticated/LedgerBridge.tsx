import Link from '@/components/navigation/AppNavLink';
import type { ReactNode } from 'react';

export type LedgerBridgeItem = {
  key: string;
  label: string;
  value: ReactNode;
  definition?: ReactNode;
  href?: string;
  state?: 'known' | 'unavailable' | 'partial';
};

export function LedgerBridge({ items, label }: { items: LedgerBridgeItem[]; label: string }) {
  return (
    <div style={{ minWidth: 0, overflowX: 'auto' }}>
      <ol
        style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`, gap: 1, overflow: 'hidden', borderRadius: 10, background: '#eae8e5' }}
        aria-label={label}
      >
        {items.map((item, index) => {
          const content = (
            <>
              <span data-state={item.state ?? 'known'} aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: item.state === 'unavailable' ? '#d4cfc8' : item.state === 'partial' ? '#7a5310' : '#1a6b43' }} />
              <span style={{ color: '#6f6a63', font: "400 9.5px/1.3 'IBM Plex Mono',monospace", textTransform: 'uppercase' }}>{item.label}</span>
              <span style={{ color: '#1c1f23', font: "500 12px/1.35 'Inter',sans-serif" }}>{item.value}</span>
              {item.definition ? <span style={{ color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>{item.definition}</span> : null}
              {index < items.length - 1 ? <span className="sr-only">then</span> : null}
            </>
          );
          return (
            <li key={item.key} style={{ minWidth: 150, padding: '12px 13px', display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: '6px 8px', background: '#fff' }}>
              {item.href ? <Link href={item.href} style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>{content}</Link> : content}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
