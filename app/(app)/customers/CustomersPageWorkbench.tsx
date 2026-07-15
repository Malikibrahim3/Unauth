'use client';

import { useMemo, type ReactNode } from 'react';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
import { CustomersPageActionBarLeft } from '@/app/(app)/customers/CustomersPageActionBarLeft';

type CustomersPageWorkbenchProps = {
  title: string;
  subtitle: string;
  actions: ReactNode;
  kpiItems: WorkbenchKpiItem[];
  main: ReactNode;
};

export function CustomersPageWorkbench({
  title,
  subtitle,
  actions,
  kpiItems,
  main,
}: CustomersPageWorkbenchProps) {
  const actionBarLeft = useMemo(() => <CustomersPageActionBarLeft />, []);

  return (
    <WorkbenchPage
      title={title}
      subtitle={subtitle}
      actions={actions}
      kpiItems={kpiItems}
      actionBarLeft={actionBarLeft}
      main={main}
    />
  );
}
