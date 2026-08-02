import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import {
  CustomerProfileMetrics,
  buildCustomerProfileHeroHeader,
} from '@/app/(app)/customers/[id]/CustomerProfilePageHero';
import { CustomerProfilePageMainColumn } from '@/app/(app)/customers/[id]/CustomerProfilePageMainColumn';
import { PageFrame } from '@/components/ui/PageFrame';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import type {
  CustomerProfileBlockedReason,
  CustomerProfilePageViewProps,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

export function CustomerProfileBlockedView({ reason }: { reason: CustomerProfileBlockedReason }) {
  if (reason === 'access_denied') {
    return (
      <PageFrame eyebrow="Customer record" title="Access denied" subtitle="You do not have permission to view this customer profile.">
        <AuthenticatedPanel bodyClassName="p-4 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">Your current workspace role does not include this record.</AuthenticatedPanel>
      </PageFrame>
    );
  }
  return (
    <PageFrame eyebrow="Customer record" title="Link expired" subtitle="This link has expired. Ask your team for a new one from Unauth.">
      <AuthenticatedPanel bodyClassName="p-4"><a href="https://unauth.co" className="ua-text-label underline" style={{ color: 'var(--ua-text-primary)' }}>Go to unauth.co</a></AuthenticatedPanel>
    </PageFrame>
  );
}

export function CustomerProfilePageView(props: CustomerProfilePageViewProps) {
  const {
    connectionState,
    auditRunId,
    viewToken,
    gorgiasSource,
    gorgiasTicketId,
    profile,
    displayName,
    profileGrade,
    hasCleanRecord,
    merchantClaimCount,
    merchantChargebackCount,
    merchantOrderCount,
    localClaimRatePct,
    isEligibleForEvidence,
    totalOrderValue,
    totalRefundedValue,
    displayCurrency,
    merchantsSeen,
    profileWideOrders,
    localOrderSharePct,
    networkChargebackRatePct,
    thisStoreMerchantSharePct,
    density,
    primaryIdentifier,
    identitySignalRows,
    identitySignals,
    transactions,
    roadmapEvents,
    identityTimeline,
    variantCount,
    merchantNarrative,
    linkedAccounts,
    merchantSignalPills,
    activityLog,
    openClaimCount,
    evidenceDisplay,
    billingAddress,
    identitySignalSummary,
    possibleMatches,
    latestClaim,
  } = props;
  void auditRunId;
  void primaryIdentifier;
  void density;
  void merchantsSeen;
  void profileWideOrders;
  void localOrderSharePct;
  void networkChargebackRatePct;
  void thisStoreMerchantSharePct;
  void evidenceDisplay;

  const header = buildCustomerProfileHeroHeader({
    displayName,
    profile,
    hasCleanRecord,
    merchantClaimCount,
    viewToken,
    openClaimCount,
    isEligibleForEvidence,
    gorgiasSource,
    gorgiasTicketId,
  });

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer case history" pageDescription="This profile shows customer order history and linked cases from merchant-owned sources. An incomplete profile can be misleading — you may see orders with no case history when helpdesk data is not syncing yet." hasData={true}>
      <SetBreadcrumbLabel label={displayName} />
      <PageFrame
        title={header.title}
        subtitle={header.subtitle}
        breadcrumbs={header.breadcrumbs}
        actions={header.actions}
        meta={header.meta}
        metrics={
          <CustomerProfileMetrics
            merchantOrderCount={merchantOrderCount}
            merchantClaimCount={merchantClaimCount}
            merchantChargebackCount={merchantChargebackCount}
            totalOrderValue={totalOrderValue}
            totalRefundedValue={totalRefundedValue}
            localClaimRatePct={localClaimRatePct}
            displayCurrency={displayCurrency}
            merchantNarrative={merchantNarrative}
          />
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <CustomerProfilePageMainColumn
            profile={profile}
            profileGrade={profileGrade}
            identitySignals={identitySignals}
            transactions={transactions}
            roadmapEvents={roadmapEvents}
            identityTimeline={identityTimeline}
            variantCount={variantCount}
            merchantSignalPills={merchantSignalPills}
            linkedAccounts={linkedAccounts}
            activityLog={activityLog}
            billingAddress={billingAddress}
            identitySignalRows={identitySignalRows}
            identitySignalSummary={identitySignalSummary}
            possibleMatches={possibleMatches}
            latestClaim={latestClaim}
            openClaimCount={openClaimCount}
          />
        </div>
      </PageFrame>
    </PageConnectionGate>
  );
}
