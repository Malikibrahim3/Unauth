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
        'text-[length:var(--ua-text-metadata-size)] leading-none',
        // §7.2 — a selected row transitions colour, never layout. The previous
        // all-property transition also animated the border and transform, which is
        // what made the old lift visibly settle.
        'transition-colors duration-[var(--ua-duration-base)] ease-[var(--ua-ease-standard)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
        active
          ? 'font-semibold text-[var(--ua-text-primary)]'
          // `--ua-surface-hover` is tuned for rows on white and is invisible
          // against the white shell, so the hover step uses the neutral
          // selected fill; the accent is reserved for the active row.
          : 'font-medium text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
        collapsed && 'justify-center',
      )}
      /*
       * Living Precision §4.2: the active row is an `--ua-accent-100` wash, a 2px
       * `--ua-accent-500` leading marker, and primary ink — no lift, no shadow,
       * no white-on-white chip. Three channels carry the selection (fill, marker,
       * weight), so it never depends on colour alone. Inactive rows keep a
       * transparent border of the same width so gaining the border does not
       * shift the label by a pixel.
       */
      style={
        active
          ? {
              background: 'var(--ua-accent-100)',
              color: 'var(--ua-text-primary)',
              border: '1px solid var(--ua-accent-200)',
            }
          : { border: '1px solid transparent' }
      }
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--ua-accent-500)]"
        />
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
                'text-[length:var(--ua-text-metadata-size)] font-semibold tabular-nums',
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
      {/* Metadata role, sentence case, no letter spacing (§3.2, §4.2). */}
      <span
        className="block text-[length:var(--ua-text-metadata-size)] font-medium leading-[var(--ua-text-metadata-leading)] text-[var(--ua-text-tertiary)]"
      >
        {label}
      </span>
    </div>
  );
}
