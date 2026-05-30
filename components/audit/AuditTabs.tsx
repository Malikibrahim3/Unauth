'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface Tab {
  id: string;
  label: string;
}

interface AuditTabsProps {
  tabs: Tab[];
  panels: Record<string, React.ReactNode>;
  defaultTab?: string;
}

export default function AuditTabs({ tabs, panels, defaultTab }: AuditTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');

  useEffect(() => {
    if (defaultTab) setActive(defaultTab);
  }, [defaultTab]);

  function selectTab(tabId: string) {
    setActive(tabId);
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tabId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div
        className="mb-6 flex gap-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className="relative px-4 py-2.5 text-body-sm font-medium transition-colors"
              style={{
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{panels[active]}</div>
    </div>
  );
}
