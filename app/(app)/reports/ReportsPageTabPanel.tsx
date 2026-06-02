import type { ReportsTab } from '@/app/(app)/reports/reportsPageTypes';
import { CsvTab, type CsvTabProps } from '@/app/(app)/reports/ReportsCsvTab';
import { LiveTab, type LiveTabProps } from '@/app/(app)/reports/ReportsLiveTab';
import { OverviewTab, type OverviewTabProps } from '@/app/(app)/reports/ReportsOverviewTab';

export type ReportsPageTabPanelProps = {
  activeTab: ReportsTab;
  overview: OverviewTabProps;
  csv: CsvTabProps;
  live: LiveTabProps;
};

export function ReportsPageTabPanel({ activeTab, overview, csv, live }: ReportsPageTabPanelProps) {
  if (activeTab === 'csv') return <CsvTab {...csv} />;
  if (activeTab === 'integration') return <LiveTab {...live} />;
  return <OverviewTab {...overview} />;
}
