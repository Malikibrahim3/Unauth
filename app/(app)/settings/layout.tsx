'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/account', label: 'Account' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/audit-trail', label: 'Data & privacy' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-full grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="border-r p-3" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}>
        <p className="t-label mb-3 px-2" style={{ color: 'var(--ink-tertiary)' }}>Settings</p>
        <nav className="space-y-1" aria-label="Settings">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="block border-l-2 px-3 py-2 text-sm transition-colors"
                style={{
                  borderLeftColor: active ? 'var(--copper-bright)' : 'transparent',
                  color: active ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
