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
      active={active}
      onNavigate={onNavigate}
      className={cn(
        'group relative flex h-7 items-center gap-2 rounded-[var(--ua-radius-control)] px-2.5',
        'text-[length:var(--ua-text-micro-size)] font-medium leading-none',
        'transition-all duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
        active
          ? 'text-[var(--ua-text-primary)]'
          : 'text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-muted)]',
        collapsed && 'justify-center',
      )}
      style={
        active
          ? {
              background: 'var(--ua-surface-selected)',
              color: 'var(--ua-text-primary)'
            }
          : undefined
      }
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-[var(--ua-text-primary)]" aria-hidden="true" />
      ) : null}
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          active
            ? 'text-[var(--ua-text-primary)]'
            : 'text-[var(--ua-icon-secondary)] group-hover:text-[var(--ua-icon-primary)]',
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
                'rounded-full px-1.5',
                'bg-[var(--ua-text-primary)] text-[var(--ua-text-inverse)]',
                'text-[length:var(--ua-text-micro-size)] font-semibold tabular-nums',
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && !!item.badge && item.badge > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--ua-text-primary)]"
          title={item.badgeTitle ?? `${item.badge} items`}
          aria-label={item.badgeTitle ? `${item.badgeTitle}: ${item.badge}` : `${item.badge} items`}
        />
      )}
    </AppNavLink>
  );
}

export function SidebarGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-2 h-px bg-[var(--ua-border-default)]" />;
  return (
    <div className="mt-4 mb-1 px-3">
      <span
        className="block leading-none"
        style={{ fontSize: 10, fontWeight: 600, color: 'var(--ua-text-tertiary)', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
    </div>
  );
}
