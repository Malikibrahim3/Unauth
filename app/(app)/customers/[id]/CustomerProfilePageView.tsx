import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { CustomerProfilePageHero } from '@/app/(app)/customers/[id]/CustomerProfilePageHero';
import { CustomerProfilePageMainColumn } from '@/app/(app)/customers/[id]/CustomerProfilePageMainColumn';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import type {
  CustomerProfileBlockedReason,
  CustomerProfilePageViewProps,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

export function CustomerProfileBlockedView({ reason }: { reason: CustomerProfileBlockedReason }) {
  if (reason === 'access_denied') {
    return (
      <div>
        <AuthenticatedPageHeader eyebrow="Customer record" title="Access denied" subtitle="You do not have permission to view this customer profile." />
        <div className={pageStyles.pageBody}><AuthenticatedPanel bodyClassName="p-4 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">Your current workspace role does not include this record.</AuthenticatedPanel></div>
      </div>
    );
  }
  return (
    <div>
      <AuthenticatedPageHeader eyebrow="Customer record" title="Link expired" subtitle="This link has expired. Ask your team for a new one from Unauth." />
      <div className={pageStyles.pageBody}><AuthenticatedPanel bodyClassName="p-4"><a href="https://unauth.co" className="text-[length:var(--ua-text-micro-size)] font-semibold underline" style={{ color: 'var(--ua-text-primary)' }}>Go to unauth.co</a></AuthenticatedPanel></div>
    </div>
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

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer payout history" pageDescription="This profile shows customer order history and linked support payout cases from merchant-owned sources. An incomplete profile can be misleading - you may see orders with no case history when helpdesk data is not syncing yet." hasData={true}>
    <div>
      <CustomerProfilePageHero
        auditRunId={auditRunId}
        displayName={displayName}
        profile={profile}
        profileGrade={profileGrade}
        hasCleanRecord={hasCleanRecord}
        merchantClaimCount={merchantClaimCount}
        merchantChargebackCount={merchantChargebackCount}
        merchantOrderCount={merchantOrderCount}
        localClaimRatePct={localClaimRatePct}
        viewToken={viewToken}
        openClaimCount={openClaimCount}
        isEligibleForEvidence={isEligibleForEvidence}
        totalOrderValue={totalOrderValue}
        totalRefundedValue={totalRefundedValue}
        displayCurrency={displayCurrency}
        merchantsSeen={merchantsSeen}
        profileWideOrders={profileWideOrders}
        localOrderSharePct={localOrderSharePct}
        networkChargebackRatePct={networkChargebackRatePct}
        thisStoreMerchantSharePct={thisStoreMerchantSharePct}
        density={density}
        primaryIdentifier={primaryIdentifier}
        identitySignalRows={identitySignalRows}
        merchantNarrative={merchantNarrative}
        gorgiasSource={gorgiasSource}
        gorgiasTicketId={gorgiasTicketId}
        evidenceDisplay={evidenceDisplay}
      />

      {/*
        LAYOUT RULES (enforced here):
        1. No column may be empty below the fold — both columns carry content to scroll depth.
        2. Sidebar = sticky contextual metadata only (Record stats, Dispute context). Max ~500px before sticking.
        3. Long-scrolling content (lists, tables, history) goes in the main column.
        4. Sidebar is position:sticky below nav height; overflows independently via overflow-y:auto.
        5. Grid is [1fr 380px] — main content gets majority width.
        6. Section order: summary → context → detail → action.
      */}
      <div className={pageStyles.pageBody}>
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
      </div>
    </div>
    </PageConnectionGate>
  );
}
