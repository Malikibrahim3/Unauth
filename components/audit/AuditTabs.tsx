'use client';

import { useState, useEffect } from 'react';

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
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');

  // Sync when the server re-renders with a new defaultTab (e.g. ?tab=customers)
  useEffect(() => {
    if (defaultTab) setActive(defaultTab);
  }, [defaultTab]);

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-0 mb-6 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className="px-4 py-2.5 text-body-sm font-medium transition-colors relative"
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

      {/* Panel */}
      <div role="tabpanel">
        {panels[active]}
      </div>
    </div>
  );
}
