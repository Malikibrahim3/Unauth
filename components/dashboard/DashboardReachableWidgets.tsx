'use client';

import InsightsStrip, { type Insight } from '@/components/dashboard/InsightsStrip';
import NextUpPanel, { type NextUpClaim } from '@/components/dashboard/NextUpPanel';
import { SavingsCard, type SavingsCardData } from '@/components/dashboard/SavingsCard';
import { LoadDemoButton } from '@/components/dashboard/LoadDemoButton';

interface DashboardReachableWidgetsProps {
  insights: Insight[];
  claims: NextUpClaim[];
  inboxCount: number;
  savings: SavingsCardData | null;
  showDemoButton?: boolean;
}

export function DashboardReachableWidgets({
  insights,
  claims,
  inboxCount,
  savings,
  showDemoButton = false,
}: DashboardReachableWidgetsProps) {
  return (
    <>
      <InsightsStrip insights={insights} />
      <NextUpPanel claims={claims} inboxCount={inboxCount} />
      <SavingsCard data={savings} loading={false} className="mt-4" />
      {showDemoButton ? (
        <div className="mt-3">
          <LoadDemoButton />
        </div>
      ) : null}
    </>
  );
}
