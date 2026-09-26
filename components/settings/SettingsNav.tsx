import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Grouped Evidence Operations settings navigation.
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
        'text-[#9f4f08] no-underline',
        orientation === 'vertical' && 'text-[#9f4f08] no-underline',
        className,
      )}
      aria-label={ariaLabel}
    >
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="text-[#9f4f08] no-underline">
          {group.label ? <p className="text-[11px] leading-[1.45] text-[#64686d]">{group.label}</p> : null}
          <ul className="flex flex-col gap-3">
            {group.items.map((item) => {
              const active = isSettingsNavItemActive(currentPath, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[#9f4f08] no-underline"
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
