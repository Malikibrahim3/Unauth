import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import ExportMenu from '@/components/reports/ExportMenu';
import { ReportsTabBar } from '@/app/(app)/reports/ReportsTabBar';
import type { ReportsTab } from '@/app/(app)/reports/reportsPageTypes';
import { ReportsPageTabPanel, type ReportsPageTabPanelProps } from '@/app/(app)/reports/ReportsPageTabPanel';

export type ReportsPageViewProps = {
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  hasAnyData: boolean;
  activeTab: ReportsTab;
  range: string;
  tabPanel: ReportsPageTabPanelProps;
};

export function ReportsPageView({
  connectionState,
  setupState,
  hasAnyData,
  activeTab,
  range,
  tabPanel,
}: ReportsPageViewProps) {
  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Analytics" pageDescription="Analytics combines Shopify order data with helpdesk claim records. Without both connected, claim counts, dispute rates, and outcome summaries will be incomplete or zero." setupState={setupState} hasData={hasAnyData}>
    <WorkbenchPage
      title="Analytics"
      subtitle="Store and network intelligence from customer, order, claim, and source-case records."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="reports"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
            {['7d', '30d', '90d', 'all'].map((option) => (
              <a
                key={option}
                href={`/reports?tab=${activeTab}&range=${option}`}
                className="t-label px-2.5 py-1"
                style={{
                  borderRadius: 3,
                  background: range === option ? 'var(--accent-soft)' : 'transparent',
                  color: range === option ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                {option}
              </a>
            ))}
          </div>
          <ExportMenu range={range} />
        </div>
      }
      main={
        <>
          <ReportsTabBar active={activeTab} range={range} />
          <ReportsPageTabPanel {...tabPanel} activeTab={activeTab} />
        </>
      }
    />
    </PageConnectionGate>
  );
}
