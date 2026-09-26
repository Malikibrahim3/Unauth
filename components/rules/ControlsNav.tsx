'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/controls/rules', label: 'Rules', icon: 'rules', exact: true },
  { href: '/controls/rules/recovery', label: 'Recovery rulebook', icon: 'recovery', exact: false },
  { href: '/controls/flows', label: 'Flows', icon: 'flows', exact: true },
  { href: '/controls/flows/runs', label: 'Run history', icon: 'runs', exact: false },
] as const;

function ControlIcon({ kind }: { kind: (typeof ITEMS)[number]['icon'] }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'rules') return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.2 4.5h9.6M2.2 9.5h9.6" {...line}/><circle cx="5.3" cy="4.5" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.3"/><circle cx="8.7" cy="9.5" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.3"/></svg>;
  if (kind === 'recovery') return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M12 7a5 5 0 1 1-1.6-3.7M12.2 2.4V5H9.6" {...line}/></svg>;
  if (kind === 'runs') return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" {...line}/><path d="M7 4.1v3.2l2 1.3" {...line}/></svg>;
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="3.7" cy="3.7" r="1.7" {...line}/><circle cx="10.3" cy="10.3" r="1.7" {...line}/><path d="M3.7 5.4v3.4a1.7 1.7 0 0 0 1.7 1.7h3" {...line}/></svg>;
}

export function ControlsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Controls sections" style={{ display: 'flex', minWidth: 0, gap: 4, overflowX: 'auto', borderBottom: '1px solid #eae8e5' }}>
      {ITEMS.map(({ href, label, icon, exact }) => {
        const active = exact
          ? pathname === href
            || (href === '/controls/rules' && /^\/controls\/rules\/(?!recovery$)[^/]+$/.test(pathname))
            || (href === '/controls/flows' && /^\/controls\/flows\/(?!runs$)[^/]+$/.test(pathname))
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} data-active={active} aria-current={active ? 'page' : undefined} style={{ display: 'inline-flex', minHeight: 40, flex: '0 0 auto', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: active ? '2px solid #ff7a30' : '2px solid transparent', color: active ? '#1c1f23' : '#64686d', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            <ControlIcon kind={icon} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LifecycleGuide({ kind }: { kind: 'rule' | 'flow' }) {
  const isRule = kind === 'rule';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 20, padding: '14px 16px', borderBottom: '1px solid #eae8e5', background: '#ffffff' }}>
      <div>
        <p style={{ margin: 0, color: '#1c1f23', fontSize: 13, fontWeight: 600 }}>{isRule ? 'Recommendations stay separate from decisions' : 'Draft automation stays separate from live execution'}</p>
        <p style={{ margin: '3px 0 0', maxWidth: '72ch', color: '#64686d', fontSize: 12, lineHeight: '17px' }}>
          {isRule
            ? 'Draft and simulate policy safely. Publishing changes the recommendation version; an authorised merchant still records every case decision.'
            : 'Build bounded actions and test a sample event without live writes. Pilot publication and live execution are unavailable.'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#6f6a63', fontSize: 11, whiteSpace: 'nowrap' }} aria-label={`${isRule ? 'Rule' : 'Flow'} lifecycle`}>
        {(isRule ? ['Draft', 'Simulate', 'Publish', 'History'] : ['Draft', 'Test', 'Diagnose']).map((step) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} key={step}><span style={{ width: 8, height: 8, border: '1px solid #d8d4ce', borderRadius: '50%', background: '#fff' }} aria-hidden="true" />{step}</span>
        ))}
      </div>
    </div>
  );
}
