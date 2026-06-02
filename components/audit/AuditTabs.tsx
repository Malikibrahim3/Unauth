'use client';

import { Suspense, useRef, useState } from 'react';
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

function AuditTabsInner({ tabs, panels, defaultTab }: AuditTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const prevDefaultTabRef = useRef(defaultTab);

  if (defaultTab !== prevDefaultTabRef.current) {
    prevDefaultTabRef.current = defaultTab;
    if (defaultTab) setActive(defaultTab);
  }

  function selectTab(tabId: string) {
    setActive(tabId);
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tabId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div
        className="flex gap-0 border-b"
        style={{ borderColor: 'var(--surface-border)' }}
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
                color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                borderBottom: isActive ? '2px solid var(--copper-bright)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4" role="tabpanel">{panels[active]}</div>

    </div>
  );
}

export default function AuditTabs(props: AuditTabsProps) {
  return (
    <Suspense fallback={<div className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>}>
      <AuditTabsInner {...props} />
    </Suspense>
  );
}
