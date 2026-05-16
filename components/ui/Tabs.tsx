'use client';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex items-end gap-5', className)}
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className="inline-flex items-center gap-2 focus-visible:outline-none rounded-sm"
            style={{
              paddingBottom: 10,
              paddingTop: 2,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid #7B2D26' : '2px solid transparent',
              transition: 'color 120ms',
              background: 'none',
              border: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: 2,
              borderBottomColor: active ? '#7B2D26' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className="inline-flex items-center justify-center leading-none"
                style={{
                  height: 16,
                  minWidth: 16,
                  paddingLeft: 4,
                  paddingRight: 4,
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? '#FBEFEC' : 'var(--bg-subtle)',
                  color: active ? '#7B2D26' : 'var(--text-muted)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
