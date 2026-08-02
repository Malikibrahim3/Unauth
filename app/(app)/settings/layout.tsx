'use client';

import { usePathname } from 'next/navigation';
import { SettingsNav, type SettingsNavGroup } from '@/components/settings/SettingsNav';

// Same ten destinations and labels as before, grouped into always-visible
// sections (§8.1) instead of a single horizontal-scroll strip. "Connections"
// still points at /integrations (outside the settings tree) by design.
const GROUPS: SettingsNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/settings/account', label: 'Workspace & account' },
      { href: '/settings/team', label: 'Team' },
      { href: '/settings/platform', label: 'Defaults' },
    ],
  },
  {
    label: 'Data & access',
    items: [
      { href: '/settings/api-integrations', label: 'API access' },
      { href: '/integrations', label: 'Connected apps' },
      { href: '/settings/data-privacy', label: 'Data & privacy' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/settings/notifications', label: 'Notifications' },
      { href: '/settings/audit-trail', label: 'Audit trail' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/settings/billing', label: 'Billing' },
      { href: '/settings/agreements', label: 'Agreements' },
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
