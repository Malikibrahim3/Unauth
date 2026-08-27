import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { Suspense } from 'react';
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
import { CustomerProfileQueryFocus } from '@/components/customers/CustomerProfileQueryFocus';

export function CustomerProfileBlockedView({ reason }: { reason: CustomerProfileBlockedReason }) {
  if (reason === 'access_denied') {
    return (
      <PageFrame title="Access denied" subtitle="You do not have permission to view this customer profile." surfaceId="customer-profile" archetype="P12">
        <div data-state-id="customer-profile-access-blocked-state"><AuthenticatedPanel bodyClassName="p-4 text-[length:var(--uo-route-text-metadata-size)] text-[var(--uo-route-text-secondary)]">Your current workspace role does not include this record. No customer name or identifier is shown.</AuthenticatedPanel></div>
      </PageFrame>
    );
  }
  return (
    <PageFrame title="Link expired" subtitle="This link has expired. Ask your team for a new one from Unauth." surfaceId="customer-profile" archetype="P12">
      <div data-state-id="customer-profile-link-expired"><AuthenticatedPanel bodyClassName="p-4"><a href="https://unauth.co" className="ua-button ua-button--secondary ua-button--sm">Go to unauth.co</a></AuthenticatedPanel></div>
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
    orderCoverage,
    caseCoverage,
    merchantClaimCount,
    merchantChargebackCount,
    merchantOrderCount,
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
    caseCoverage,
    merchantClaimCount,
    viewToken,
    openClaimCount,
    isEligibleForEvidence,
    gorgiasSource,
    gorgiasTicketId,
  });

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer case history" pageDescription="This profile shows customer order history and linked cases from merchant-owned sources. An incomplete profile can be misleading — you may see orders with no case history when helpdesk data is not syncing yet." hasData={true}>
      <Suspense fallback={null}><CustomerProfileQueryFocus /></Suspense>
      <SetBreadcrumbLabel label={displayName} />
      <PageFrame
        title={header.title}
        subtitle={header.subtitle}
        breadcrumbs={header.breadcrumbs}
        actions={header.actions}
        meta={header.meta}
        surfaceId="customer-profile"
        archetype="P7"
        metrics={
          <CustomerProfileMetrics
            merchantOrderCount={merchantOrderCount}
            orderCoverage={orderCoverage}
            caseCoverage={caseCoverage}
            merchantClaimCount={merchantClaimCount}
            merchantChargebackCount={merchantChargebackCount}
            totalOrderValue={totalOrderValue}
            totalRefundedValue={totalRefundedValue}
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
            orderCoverage={orderCoverage}
            caseCoverage={caseCoverage}
          />
        </div>
      </PageFrame>
    </PageConnectionGate>
  );
}
