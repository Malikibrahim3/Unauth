import Link from '@/components/navigation/AppNavLink';
import type { ClaimsFilterTab } from './ClaimsPageView';

/** Labels, destinations and selection all come from the canonical queue model. */
export function CasesQueueTabs({ filterTabs }: { filterTabs: ClaimsFilterTab[] }) {
  const tabs = ['All', 'Needs evidence', 'Ready for decision']
    .flatMap(label => filterTabs.filter(tab => tab.label === label));
  return <nav aria-label="Case work states" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: 3, borderRadius: 9, background: '#f4f3f1' }}>
    {tabs.map(tab => <Link key={tab.label} href={tab.href} aria-current={tab.active ? 'page' : undefined}
      style={{ padding: '5px 10px', borderRadius: 7, background: tab.active ? '#fff' : 'transparent', boxShadow: tab.active ? '0 1px 2px rgba(28,27,25,.08)' : 'none', color: tab.active ? '#1c1f23' : '#64686d', font: `${tab.active ? 500 : 400} 11.5px/1 'Inter',sans-serif`, textDecoration: 'none' }}>
      {tab.label === 'All' ? 'Needs action' : tab.label}
    </Link>)}
  </nav>;
}
