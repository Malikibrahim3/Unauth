'use client';

import AppNavLink from '@/components/navigation/AppNavLink';
import { cn } from '@/lib/utils';
import type { AppRoute } from '@/lib/navigation/appRoutes';

export type NavItemView = {
  href: string;
  label: string;
  icon: AppRoute['icon'];
  badge?: number;
  badgeTitle?: string;
  isPrimary?: boolean;
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
        'group relative flex h-8 items-center gap-3 rounded-md px-2',
        'text-[13px] font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
        active
          ? 'bg-[var(--copper-glow)] text-[var(--ink-primary)] font-semibold'
          : item.isPrimary
            ? 'border border-[var(--surface-border)] bg-transparent text-[var(--ink-primary)] hover:text-[var(--copper-bright)]'
            : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink-primary)]',
        collapsed && 'justify-center',
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-0 bottom-0 rounded-r-sm"
          style={{ background: 'var(--copper-bright)', width: 3 }}
          aria-hidden="true"
        />
      )}

      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          active
            ? 'text-[var(--copper-bright)]'
            : 'text-[var(--ink-tertiary)] group-hover:text-[var(--ink-secondary)]',
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
                'rounded-sm px-1',
                'bg-[var(--surface-muted)] text-[var(--ink-secondary)]',
                'text-caption font-mono tabular-nums',
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && !!item.badge && item.badge > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--sev-definite)]"
          title={item.badgeTitle ?? `${item.badge} items`}
          aria-label={item.badgeTitle ? `${item.badgeTitle}: ${item.badge}` : `${item.badge} items`}
        />
      )}
    </AppNavLink>
  );
}

export function SidebarGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-2 h-px bg-[var(--surface-border)]" />;
  return (
    <div className="mt-5 mb-1 px-2">
      <span
        className="block text-xs font-semibold leading-none"
        style={{ color: 'var(--ink-tertiary)', letterSpacing: '0.01em' }}
      >
        {label}
      </span>
    </div>
  );
}
