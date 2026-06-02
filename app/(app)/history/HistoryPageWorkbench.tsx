'use client';

import { useMemo, type ReactNode } from 'react';
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
import type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
import type { WorkbenchNavItem } from '@/components/workbench/WorkbenchNav';
import { HistoryPageActionBarLeft, HistoryPageActionBarRight } from '@/app/(app)/history/HistoryPageActionBar';

type HistoryPageWorkbenchProps = {
  title: string;
  subtitle: string;
  navItems: WorkbenchNavItem[];
  actions: ReactNode;
  kpiItems: WorkbenchKpiItem[];
  page: number;
  totalPages: number;
  pageSize: number;
  baseSearchParams: Record<string, string>;
  main: ReactNode;
};

export function HistoryPageWorkbench({
  title,
  subtitle,
  navItems,
  actions,
  kpiItems,
  page,
  totalPages,
  pageSize,
  baseSearchParams,
  main,
}: HistoryPageWorkbenchProps) {
  const actionBarLeft = useMemo(
    () => <HistoryPageActionBarLeft pageSize={pageSize} />,
    [pageSize],
  );
  const actionBarRight = useMemo(
    () => (
      <HistoryPageActionBarRight
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        baseSearchParams={baseSearchParams}
      />
    ),
    [baseSearchParams, page, pageSize, totalPages],
  );

  return (
    <WorkbenchPage
      title={title}
      subtitle={subtitle}
      navItems={navItems}
      activeNavKey="audits"
      actions={actions}
      kpiItems={kpiItems}
      actionBarLeft={actionBarLeft}
      actionBarRight={actionBarRight}
      main={main}
    />
  );
}
