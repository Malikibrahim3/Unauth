'use client';

import Link from '@/components/navigation/AppNavLink';

export interface WorkbenchNavItem {
  key: string;
  label: string;
  href: string;
}

interface WorkbenchNavProps {
  items: WorkbenchNavItem[];
  activeKey: string;
}

export function WorkbenchNav({ items, activeKey }: WorkbenchNavProps) {
  return (
    <nav className="flex items-center gap-5 overflow-x-auto" aria-label="Section navigation">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className="border-b-2 pb-3 text-body-sm transition-colors"
            style={{
              borderBottomColor: active ? '#1c1f23' : 'transparent',
              color: active ? '#1c1f23' : '#64686d',
              fontWeight: active ? 600 : 500,
              letterSpacing: active ? '0' : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
