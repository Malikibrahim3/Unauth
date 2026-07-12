import type { ReportsTab } from '@/app/(app)/reports/reportsPageTypes';
import { RecoveryTab, type RecoveryTabProps } from '@/app/(app)/reports/ReportsLiveTab';
import { OverviewTab, type OverviewTabProps } from '@/app/(app)/reports/ReportsOverviewTab';

export type ReportsPageTabPanelProps = {
  activeTab: ReportsTab;
  overview: OverviewTabProps;
  recovery: RecoveryTabProps;
};

export function ReportsPageTabPanel({ activeTab, overview, recovery }: ReportsPageTabPanelProps) {
  if (activeTab === 'recovery') return <RecoveryTab {...recovery} />;
  return <OverviewTab {...overview} />;
}
