'use client';

import { usePathname } from 'next/navigation';
import { SettingsNav, type SettingsNavGroup } from '@/components/settings/SettingsNav';

// Canonical settings takeover rail. The route hierarchy stays explicit so the
// utility shell, local settings navigation, and deep links agree on one URL.
const GROUPS: SettingsNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/settings/workspace/account', label: 'Workspace & account' },
      { href: '/settings/workspace/team', label: 'Team' },
      { href: '/settings/product/platform', label: 'Defaults' },
    ],
  },
  {
    label: 'Data & access',
    items: [
      { href: '/settings/developers/api-access', label: 'API access' },
      { href: '/sources/connected', label: 'Connected sources' },
      { href: '/settings/legal/data-privacy', label: 'Data & privacy' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/settings/product/notifications', label: 'Notifications' },
      { href: '/settings/governance/audit-trail', label: 'Audit trail' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/settings/billing', label: 'Billing' },
      { href: '/settings/legal/agreements', label: 'Agreements' },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="ua-settings-workspace min-h-full">
      <aside className="ua-settings-local-rail" aria-label="Settings navigation">
        <div className="ua-settings-local-rail__inner">
          <div className="ua-settings-local-rail__heading">
            <p>Settings</p>
            <span>Workspace controls</span>
          </div>
          <SettingsNav
            groups={GROUPS}
            currentPath={pathname}
            orientation="vertical"
            aria-label="Settings sections"
          />
        </div>
      </aside>
      <div className="ua-settings-mobile-nav">
        <SettingsNav
          groups={GROUPS}
          currentPath={pathname}
          aria-label="Settings sections"
        />
      </div>
      <div className="ua-settings-content min-w-0">{children}</div>
    </div>
  );
}
