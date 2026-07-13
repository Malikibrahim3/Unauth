'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/account', label: 'Workspace & account' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/platform', label: 'Financial & workflow defaults' },
  { href: '/integrations', label: 'Connections' },
  { href: '/settings/agreements', label: 'Agreements' },
  { href: '/settings/api-integrations', label: 'API access' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/data-privacy', label: 'Data & privacy' },
  { href: '/settings/audit-trail', label: 'Audit trail' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-full grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside
        className="border-b px-5 py-5 xl:border-b-0 xl:border-r xl:px-6 xl:py-6"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <p className="t-label mb-3 px-2" style={{ color: 'var(--text-tertiary)' }}>Settings</p>
        <nav className="flex gap-1 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0" aria-label="Settings">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="block shrink-0 whitespace-nowrap rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors xl:whitespace-normal"
                style={{
                  borderColor: active ? 'var(--border)' : 'transparent',
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 bg-[var(--bg-canvas)]">{children}</div>
    </div>
  );
}
