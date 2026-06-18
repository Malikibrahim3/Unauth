import Link from 'next/link';
import { Radio } from 'lucide-react';
import { REPORTS_TABS, type ReportsTab } from '@/app/(app)/reports/reportsPageTypes';

const TAB_META: Record<ReportsTab, { label: string; icon: typeof Radio | null }> = {
  overview: { label: 'Overview', icon: null },
  integration: { label: 'Live intelligence', icon: Radio },
};

export function ReportsTabBar({
  active,
  range,
}: {
  active: ReportsTab;
  range: string;
}) {
  return (
    <div
      className="flex border-b px-8"
      style={{ borderColor: 'var(--border-muted)', gap: 24 }}
    >
      {REPORTS_TABS.map((tab) => {
        const Icon = TAB_META[tab].icon;
        const isActive = active === tab;
        return (
          <Link
            key={tab}
            href={`/reports?tab=${tab}&range=${range}`}
            className="inline-flex items-center -mb-px transition-colors"
            style={{
              height: 36,
              padding: '0 4px',
              gap: 6,
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
            }}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {TAB_META[tab].label}
          </Link>
        );
      })}
    </div>
  );
}
