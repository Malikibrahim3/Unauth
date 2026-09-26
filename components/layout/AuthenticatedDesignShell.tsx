'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Permission } from '@/lib/permissions';
import type { WorkspaceOption } from './WorkspaceSwitcher';
import { ExactAuthenticatedShell } from './ExactAuthenticatedShell';
import { useAuthenticatedShellPresentationOverride } from './BreadcrumbOverrideContext';
import RouteErrorSource from '@/components/visual-authority/generated/Route-Error-Clean';
import NotFoundSource from '@/components/visual-authority/generated/Not-Found-Clean';
import LoadingRegistrySource from '@/components/visual-authority/generated/Loading-Registry-Clean';
import LoadingDetailSource from '@/components/visual-authority/generated/Loading-Detail-Clean';
import WriteOffSource from '@/components/visual-authority/generated/Write-Off-Clean';
import FileClaimSource from '@/components/visual-authority/generated/File-Claim-Clean';
import ReportRecordsSource from '@/components/visual-authority/generated/Report-Records-Clean';
import PeriodCloseSource from '@/components/visual-authority/generated/Period-Close-Clean';
import RuleEditorSource from '@/components/visual-authority/generated/Rule-Editor-Clean';
import SourceRepairSource from '@/components/visual-authority/generated/Source-Repair-Clean';
import MappingRepairSource from '@/components/visual-authority/generated/Mapping-Repair-Clean';
import FirstRunSource from '@/components/visual-authority/generated/First-Run-Clean';

type Props = {
  children: ReactNode;
  workspaceName: string | null;
  reportingCurrency?: string | null;
  timezone?: string | null;
  workspaces: WorkspaceOption[];
  activeMerchantId: string | null;
  userName: string | null;
  userEmail: string;
  userRole: string;
  permissions: Permission[];
  sourceTone: 'green' | 'amber' | 'red' | 'neutral';
  sourceLabel: string;
  screenshotMode?: boolean;
  workCount?: number;
  caseCount?: number;
  reconciliationCount?: number;
  acceptanceScenarioId?: string | null;
};

/**
 * Project the authenticated chrome from the supplied page assigned to the
 * current canonical route. Runtime truth only replaces values and handlers
 * inside that source markup.
 */
export default function AuthenticatedDesignShell({
  children,
  workspaceName,
  reportingCurrency,
  timezone,
  workspaces,
  activeMerchantId,
  userName,
  userEmail,
  userRole,
  permissions,
  sourceTone,
  sourceLabel,
  screenshotMode,
  workCount,
  caseCount,
  reconciliationCount,
  acceptanceScenarioId = null,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const presentation = useAuthenticatedShellPresentationOverride();
  const presentationSource = presentation?.kind === 'first-run'
    ? FirstRunSource
    : presentation?.kind === 'route-error'
    ? RouteErrorSource
    : presentation?.kind === 'not-found'
      ? NotFoundSource
      : presentation?.kind === 'loading-registry'
        ? LoadingRegistrySource
        : presentation?.kind === 'loading-detail'
          ? LoadingDetailSource
          : undefined;
  const stateSource = pathname === '/financials/recovery/new'
    ? FileClaimSource
    : pathname === '/financials/reports/records'
      ? ReportRecordsSource
      : pathname.startsWith('/controls/rules/') && pathname !== '/controls/rules/recovery'
        ? RuleEditorSource
        : pathname.startsWith('/financials/losses/') && searchParams.get('action') === 'write-off'
          ? WriteOffSource
          : pathname === '/financials/reconciliation' && searchParams.get('action') === 'close'
            ? PeriodCloseSource
            : /^\/sources\/[^/]+$/.test(pathname) && searchParams.get('tab') === 'repair'
              ? SourceRepairSource
              : /^\/sources\/imports\/[^/]+$/.test(pathname) && searchParams.get('step') === 'mapping'
                ? MappingRepairSource
                : undefined;
  const sourcePageOverride = presentationSource ?? stateSource;
  return (
    <ExactAuthenticatedShell
      pathname={pathname}
      workspaceName={workspaceName}
      reportingCurrency={reportingCurrency}
      timezone={timezone}
      workspaces={workspaces}
      activeMerchantId={activeMerchantId}
      userName={userName}
      userEmail={userEmail}
      userRole={userRole}
      permissions={permissions}
      sourceTone={sourceTone}
      sourceLabel={sourceLabel}
      screenshotMode={screenshotMode}
      workCount={workCount}
      caseCount={caseCount}
      reconciliationCount={reconciliationCount}
      sourcePageOverride={sourcePageOverride}
      acceptanceScenarioId={acceptanceScenarioId}
    >
      {children}
    </ExactAuthenticatedShell>
  );
}
