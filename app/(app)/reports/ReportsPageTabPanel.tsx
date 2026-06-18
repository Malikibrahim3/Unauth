import type { ReportsTab } from '@/app/(app)/reports/reportsPageTypes';
import { LiveTab, type LiveTabProps } from '@/app/(app)/reports/ReportsLiveTab';
import { OverviewTab, type OverviewTabProps } from '@/app/(app)/reports/ReportsOverviewTab';

export type ReportsPageTabPanelProps = {
  activeTab: ReportsTab;
  overview: OverviewTabProps;
  live: LiveTabProps;
};

export function ReportsPageTabPanel({ activeTab, overview, live }: ReportsPageTabPanelProps) {
  if (activeTab === 'integration') return <LiveTab {...live} />;
  return <OverviewTab {...overview} />;
}
