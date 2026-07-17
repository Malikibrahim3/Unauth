'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/account', label: 'Workspace & account' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/platform', label: 'Defaults' },
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
    <div className="min-h-full">
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 md:px-5">
        <nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Settings">
          <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)]">Settings</span>
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-[var(--ua-radius-input)] border px-2.5 text-[11px] font-medium transition-colors"
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
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
