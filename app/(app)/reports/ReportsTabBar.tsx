import Link from 'next/link';
import { FileSpreadsheet, Radio } from 'lucide-react';
import { REPORTS_TABS, type ReportsTab } from '@/app/(app)/reports/reportsPageTypes';

const TAB_META: Record<ReportsTab, { label: string; icon: typeof Radio | null }> = {
  overview: { label: 'Overview', icon: null },
  csv: { label: 'CSV audits', icon: FileSpreadsheet },
  integration: { label: 'Live reports', icon: Radio },
};

export function ReportsTabBar({
  active,
  range,
  csvCount,
}: {
  active: ReportsTab;
  range: string;
  csvCount: number;
}) {
  return (
    <div
      className="flex gap-1 border-b px-4"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}
    >
      {REPORTS_TABS.map((tab) => {
        const Icon = TAB_META[tab].icon;
        const isActive = active === tab;
        return (
          <Link
            key={tab}
            href={`/reports?tab=${tab}&range=${range}`}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: isActive ? 'var(--copper-bright)' : 'transparent',
              color: isActive ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {TAB_META[tab].label}
            {tab === 'csv' && csvCount > 0 ? (
              <span
                className="num inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-xs font-bold"
                style={{
                  background: isActive ? 'var(--copper-glow)' : 'var(--surface-muted)',
                  color: isActive ? 'var(--copper-bright)' : 'var(--ink-tertiary)',
                }}
              >
                {csvCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
