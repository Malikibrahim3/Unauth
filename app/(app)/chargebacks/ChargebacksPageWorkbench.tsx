'use client';

import { useMemo, type ReactNode } from 'react';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
import type { WorkbenchNavItem } from '@/components/workbench/WorkbenchNav';
import { ChargebacksPageActionBarRight } from '@/app/(app)/chargebacks/ChargebacksPageActionBarRight';

type ChargebacksPageWorkbenchProps = {
  title: string;
  subtitle: string;
  navItems: WorkbenchNavItem[];
  actions: ReactNode;
  kpiItems: WorkbenchKpiItem[];
  main: ReactNode;
};

export function ChargebacksPageWorkbench({
  title,
  subtitle,
  navItems,
  actions,
  kpiItems,
  main,
}: ChargebacksPageWorkbenchProps) {
  const actionBarRight = useMemo(() => <ChargebacksPageActionBarRight />, []);

  return (
    <WorkbenchPage
      title={title}
      subtitle={subtitle}
      navItems={navItems}
      activeNavKey="evidence"
      actions={actions}
      kpiItems={kpiItems}
      actionBarRight={actionBarRight}
      main={main}
    />
  );
}
