'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import AppNavLink from '@/components/navigation/AppNavLink';
import type { Permission } from '@/lib/permissions';
import { useSettingsPermissions } from '@/components/settings/SettingsAccessContext';

const SETTINGS_GROUPS = [
  { label: 'Workspace', items: [
    { href: '/settings/workspace/account', label: 'Account', permission: 'view_settings' },
    { href: '/settings/product/platform', label: 'Money and period', permission: 'view_settings' },
    { href: '/notifications', label: 'Inbox', permission: 'view_inbox' },
    { href: '/settings/product/notifications', label: 'Notification preferences', permission: 'view_inbox' },
  ] },
  { label: 'Governance', items: [
    { href: '/settings/workspace/team', label: 'Team and roles', permission: 'view_team' },
    { href: '/settings/governance/audit-trail', label: 'Audit log', permission: 'view_audit_trail' },
    { href: '/settings/legal/data-privacy', label: 'Data privacy', permission: 'view_audit_trail' },
    { href: '/settings/legal/agreements', label: 'Agreements', permission: 'manage_settings' },
  ] },
  { label: 'Developers', items: [
    { href: '/settings/developers/api-access', label: 'API access', permission: 'manage_settings' },
  ] },
  { label: 'Billing', items: [
    { href: '/settings/billing', label: 'Plan and credits', permission: 'manage_settings' },
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

export function HandoffSettingsNav({
  workspaceName,
  workspaceCreatedLabel,
}: {
  workspaceName?: string | null;
  workspaceCreatedLabel?: string | null;
} = {}) {
  const pathname = usePathname();
  const permissions = new Set(useSettingsPermissions());
  const visibleGroups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Settings sections" tabIndex={0} data-reference-tag="div" style={{ "width": "186px", "flex": "none", minHeight: 0, overflowY: 'auto', "background": "#f4f3f1", "borderRadius": "13px", "padding": "9px", "display": "flex", "flexDirection": "column", "gap": "2px" }}>
      {visibleGroups.map((group, index) => (
        <Fragment key={group.label}>
          <div style={{ flexShrink: 0, "padding": index === 0 ? "4px 10px 7px" : "12px 10px 7px", "font": "600 10px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{group.label.toUpperCase()}</div>
          {group.items.map((section) => isActive(pathname, section.href) ? <div key={section.href} data-active="true" style={{ flexShrink: 0, "display": "flex", "alignItems": "center", "gap": "8px", "padding": "7px 10px", "borderRadius": "8px", "background": "#ffffff", "boxShadow": "0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.06)" }}><span aria-current="page" style={{ "flex": "1", "font": "500 12.5px/1.3 'Inter',sans-serif", "color": "#1c1f23" }}>{section.label}</span></div> : <div key={section.href} style={{ flexShrink: 0, "display": "flex", "alignItems": "center", "gap": "8px", "padding": "7px 10px", "borderRadius": "8px" }} {...{"style-hover":"background:#efece8"}} onMouseEnter={(event) => { Object.assign(event.currentTarget.style, {"background":"#efece8"}); }} onMouseLeave={(event) => { Object.assign(event.currentTarget.style, {"background":""}); }} onFocus={(event) => { Object.assign(event.currentTarget.style, {"background":"#efece8"}); }} onBlur={(event) => { Object.assign(event.currentTarget.style, {"background":""}); }}><AppNavLink href={section.href} style={{ "flex": "1", "font": "400 12.5px/1.3 'Inter',sans-serif", "color": "#64686d" }}>{section.label}</AppNavLink></div>)}
        </Fragment>
      ))}
      <div style={{ "flex": "1" }} />
      <div style={{ flexShrink: 0, "padding": "10px", "borderTop": "1px solid #e4e3e0", "marginTop": "6px" }}>{"\n          "}<div style={{ "font": "400 10.5px/1.5 'IBM Plex Mono',monospace", "color": "#64686d" }}>{"workspace"}</div>{"\n          "}<div style={{ "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{workspaceName?.trim() || 'Current workspace'}{workspaceCreatedLabel ? ` · ${workspaceCreatedLabel}` : ''}</div>{"\n        "}</div>
    </nav>
  );
}
