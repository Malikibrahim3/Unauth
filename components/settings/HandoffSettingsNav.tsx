'use client';

import { usePathname } from 'next/navigation';
import AppNavLink from '@/components/navigation/AppNavLink';
import type { Permission } from '@/lib/permissions';
import { useSettingsPermissions } from '@/components/settings/SettingsAccessContext';
import styles from '@/components/settings/OperationsSettings.module.css';

const SETTINGS_GROUPS = [
  { label: 'Workspace', items: [
    { href: '/settings/workspace/account', label: 'Account and appearance', permission: 'view_settings' },
    { href: '/settings/workspace/team', label: 'People and roles', permission: 'view_team' },
  ] },
  { label: 'Product', items: [
    { href: '/settings/product/platform', label: 'Decision limits', permission: 'view_settings' },
    { href: '/settings/product/notifications', label: 'Notifications', permission: 'view_inbox' },
  ] },
  { label: 'Governance', items: [
    { href: '/settings/governance/audit-trail', label: 'Audit log', permission: 'view_audit_trail' },
  ] },
  { label: 'Legal and data', items: [
    { href: '/settings/legal/data-privacy', label: 'Data privacy', permission: 'view_audit_trail' },
    { href: '/settings/legal/agreements', label: 'Agreements', permission: 'manage_settings' },
  ] },
  { label: 'Developer', items: [
    { href: '/settings/developers/api-access', label: 'API access', permission: 'manage_settings' },
  ] },
  { label: 'Billing', items: [
    { href: '/settings/billing', label: 'Plan and usage', permission: 'manage_settings' },
  ] },
] as const satisfies ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ href: string; label: string; permission: Permission }>;
}>;

function isActive(pathname: string, href: string) {
  if (href === '/settings/workspace/account') {
    return pathname === href
      || pathname === '/settings';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HandoffSettingsNav() {
  const pathname = usePathname();
  const permissions = new Set(useSettingsPermissions());
  const visibleGroups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className={`ua-handoff-settings-nav ${styles.settingsNav}`} aria-label="Settings sections">
      <p className={styles.settingsNavTitle}>Settings</p>
      {visibleGroups.map((group) => (
        <section className={styles.settingsNavGroup} key={group.label} aria-labelledby={`settings-group-${group.label.replaceAll(' ', '-').toLowerCase()}`}>
          <h2 id={`settings-group-${group.label.replaceAll(' ', '-').toLowerCase()}`}>{group.label}</h2>
          {group.items.map((section) => {
            const active = isActive(pathname, section.href);
            return (
              <AppNavLink
                className={styles.settingsNavLink}
                key={section.href}
                href={section.href}
                active={active}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : undefined}
              >
                <span>{section.label}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M3 1.5L7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </AppNavLink>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
