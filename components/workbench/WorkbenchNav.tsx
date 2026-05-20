'use client';

import Link from 'next/link';

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
    <nav className="flex items-center gap-4" aria-label="Section navigation">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            className="border-b-2 pb-1 text-body-sm transition-colors"
            style={{
              borderBottomColor: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: active ? 600 : 500,
              letterSpacing: active ? '0' : undefined,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
