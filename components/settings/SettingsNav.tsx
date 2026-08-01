import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Grouped Instrument Grade settings navigation.
 *
 * The prior settings nav was a single flat strip of ten links that scrolled
 * horizontally once it ran out of room (`overflow-x-auto`). §8.1 replaces that
 * with grouped navigation whose sections are always visible: the links wrap
 * under quiet section labels instead of disappearing off the edge.
 *
 * The component is presentation-only and takes the current path as a prop, so
 * it stays server-renderable; the active test matches the exact route or any
 * child route. `orientation="vertical"` is the §5.4 left-rail form that the
 * core/governance settings route phases can adopt beside a form column.
 */
export interface SettingsNavItem {
  href: string;
  label: string;
}

export interface SettingsNavGroup {
  /** Quiet section label, e.g. "Workspace". Omit for an unlabelled group. */
  label?: string;
  items: SettingsNavItem[];
}

export interface SettingsNavProps {
  groups: SettingsNavGroup[];
  /** The active pathname (e.g. from `usePathname()` in the client layout). */
  currentPath: string;
  orientation?: 'horizontal' | 'vertical';
  'aria-label'?: string;
  className?: string;
}

export function isSettingsNavItemActive(currentPath: string, href: string): boolean {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function SettingsNav({
  groups,
  currentPath,
  orientation = 'horizontal',
  'aria-label': ariaLabel = 'Settings',
  className,
}: SettingsNavProps) {
  return (
    <nav
      className={cn(
        'ua-settings-nav',
        orientation === 'vertical' && 'ua-settings-nav--vertical',
        className,
      )}
      aria-label={ariaLabel}
    >
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="ua-settings-nav__group">
          {group.label ? <p className="ua-settings-nav__group-label">{group.label}</p> : null}
          <ul className="ua-settings-nav__list">
            {group.items.map((item) => {
              const active = isSettingsNavItemActive(currentPath, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="ua-settings-nav__link"
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
