'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/account', label: 'Account' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/integrations', label: 'Integrations' },
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
        <nav className="space-y-1" aria-label="Settings">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="block rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors"
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
