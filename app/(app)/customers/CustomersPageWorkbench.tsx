'use client';

import { useMemo, type ReactNode } from 'react';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
import type { WorkbenchNavItem } from '@/components/workbench/WorkbenchNav';
import { CustomersPageActionBarLeft } from '@/app/(app)/customers/CustomersPageActionBarLeft';

type CustomersPageWorkbenchProps = {
  title: string;
  subtitle: string;
  navItems: WorkbenchNavItem[];
  actions: ReactNode;
  kpiItems: WorkbenchKpiItem[];
  primaryVisual?: ReactNode;
  main: ReactNode;
  rail?: ReactNode;
};

export function CustomersPageWorkbench({
  title,
  subtitle,
  navItems,
  actions,
  kpiItems,
  primaryVisual,
  main,
  rail,
}: CustomersPageWorkbenchProps) {
  const actionBarLeft = useMemo(() => <CustomersPageActionBarLeft />, []);

  return (
    <WorkbenchPage
      title={title}
      subtitle={subtitle}
      navItems={navItems}
      activeNavKey="customers"
      actions={actions}
      kpiItems={kpiItems}
      primaryVisual={primaryVisual}
      actionBarLeft={actionBarLeft}
      main={main}
      rail={rail}
    />
  );
}
