'use client';

import AppNavLink from '@/components/navigation/AppNavLink';
import { cn } from '@/lib/utils';
import type { AppRoute } from '@/lib/navigation/appRoutes';
import type { ProductTier } from '@/lib/product/tiers';

export type NavItemView = {
  href: string;
  label: string;
  icon: AppRoute['icon'];
  badge?: number;
  badgeTitle?: string;
  isPrimary?: boolean;
  tier?: ProductTier;
  tierLabel?: string;
  tierFuture?: boolean;
  showDevAccess?: boolean;
};

export function SidebarNavItem({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItemView;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  if (!Icon) return null;

  return (
    <AppNavLink
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      active={active}
      onNavigate={onNavigate}
      className={cn(
        'group relative flex h-8 items-center gap-2.5 rounded-[var(--uo-route-radius-control)] px-2.5',
        'text-[length:var(--uo-route-text-dense-size)] leading-none',
        'transition-colors duration-[var(--uo-route-duration-base)] ease-[var(--uo-route-ease-standard)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--uo-route-border-focus)] focus-visible:outline-offset-2',
        active
          ? 'font-semibold text-[var(--uo-route-text-primary)]'
          // `--uo-route-surface-hover` is tuned for rows on white and is invisible
          // against the white shell, so the hover step uses the neutral
          // selected fill; the accent is reserved for the active row.
          : 'font-medium text-[var(--uo-route-text-secondary)] hover:bg-[var(--uo-route-surface-hover)] hover:text-[var(--uo-route-text-primary)]',
        collapsed && 'justify-center',
      )}
    >
      {/*
        M8: one selected-state vocabulary — primary ink plus a 2px accent
        edge, never a background fill (matches Tabs' underline exactly, just
        rotated onto the vertical axis for a side rail).
      */}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--uo-route-accent-500)]"
        />
      ) : null}
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          active
            ? 'text-[var(--uo-route-text-primary)]'
            : 'text-[var(--uo-route-icon-secondary)] group-hover:text-[var(--uo-route-icon-primary)]',
        )}
        aria-hidden="true"
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {!!item.badge && item.badge > 0 && (
            <span
              title={item.badgeTitle ?? `${item.badge} items`}
              aria-label={item.badgeTitle ? `${item.badgeTitle}: ${item.badge}` : `${item.badge} items`}
              className={cn(
                'inline-flex h-[18px] min-w-[18px] items-center justify-center',
                'rounded-full border border-[var(--uo-route-border-default)] px-1.5',
                'bg-[var(--uo-route-surface-muted)] text-[var(--uo-route-text-secondary)]',
                'text-[length:var(--uo-route-text-metadata-size)] font-medium tabular-nums',
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && !!item.badge && item.badge > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border border-[var(--uo-route-shell)] bg-[var(--uo-route-text-tertiary)]"
          title={item.badgeTitle ?? `${item.badge} items`}
          aria-label={item.badgeTitle ? `${item.badgeTitle}: ${item.badge}` : `${item.badge} items`}
        />
      )}
    </AppNavLink>
  );
}

export function SidebarGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-2 h-px bg-[var(--uo-route-border-subtle)]" />;
  return (
    <div className="mb-1 mt-5 px-2.5">
      <span
        className="block text-[length:var(--uo-route-text-metadata-size)] font-medium leading-[var(--uo-route-text-metadata-leading)] text-[var(--uo-route-text-tertiary)]"
      >
        {label}
      </span>
    </div>
  );
}
