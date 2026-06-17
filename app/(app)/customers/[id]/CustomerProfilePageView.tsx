import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { CustomerProfilePageHero } from '@/app/(app)/customers/[id]/CustomerProfilePageHero';
import { CustomerProfilePageMainColumn } from '@/app/(app)/customers/[id]/CustomerProfilePageMainColumn';
import { CustomerProfilePageSidebar } from '@/app/(app)/customers/[id]/CustomerProfilePageSidebar';
import type {
  CustomerProfileBlockedReason,
  CustomerProfilePageViewProps,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

export function CustomerProfileBlockedView({ reason }: { reason: CustomerProfileBlockedReason }) {
  if (reason === 'access_denied') {
    return (
      <div className="p-8">
        <h1 className="text-heading-lg">Access denied</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          You do not have permission to view this customer profile.
        </p>
      </div>
    );
  }
  return (
    <div className="p-8">
      <h1 className="text-heading-lg">Link expired</h1>
      <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
        This link has expired. Ask your team for a new one from Unauth.
      </p>
      <a href="https://unauth.co" className="text-body-sm mt-3 inline-block underline" style={{ color: 'var(--text)' }}>
        Go to unauth.co
      </a>
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
    merchantOrderCount,
    localClaimRatePct,
    isEligibleForEvidence,
    totalOrderValue,
    totalRefundedValue,
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
    latestClaim,
    merchantRefundRate,
    evidenceDisplay,
  } = props;

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer profile" pageDescription="This profile shows order patterns and identity signals from Shopify, but claim data comes from your helpdesk. An incomplete profile can be misleading — you may see orders with no claim history, not because the customer is clean, but because claim data isn't syncing yet." hasData={true}>
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <CustomerProfilePageHero
        auditRunId={auditRunId}
        displayName={displayName}
        profile={profile}
        profileGrade={profileGrade}
        hasCleanRecord={hasCleanRecord}
        merchantClaimCount={merchantClaimCount}
        merchantOrderCount={merchantOrderCount}
        localClaimRatePct={localClaimRatePct}
        viewToken={viewToken}
        openClaimCount={openClaimCount}
        isEligibleForEvidence={isEligibleForEvidence}
        totalOrderValue={totalOrderValue}
        totalRefundedValue={totalRefundedValue}
        merchantsSeen={merchantsSeen}
        profileWideOrders={profileWideOrders}
        localOrderSharePct={localOrderSharePct}
        networkChargebackRatePct={networkChargebackRatePct}
        thisStoreMerchantSharePct={thisStoreMerchantSharePct}
        density={density}
        primaryIdentifier={primaryIdentifier}
        identitySignalRows={identitySignalRows}
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
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-[var(--space-6)]">
        <CustomerProfilePageMainColumn
          profile={profile}
          profileGrade={profileGrade}
          hasCleanRecord={hasCleanRecord}
          merchantOrderCount={merchantOrderCount}
          merchantNarrative={merchantNarrative}
          identitySignals={identitySignals}
          transactions={transactions}
          roadmapEvents={roadmapEvents}
          identityTimeline={identityTimeline}
          variantCount={variantCount}
          merchantSignalPills={merchantSignalPills}
          linkedAccounts={linkedAccounts}
          activityLog={activityLog}
        />
        <CustomerProfilePageSidebar
          profile={profile}
          merchantOrderCount={merchantOrderCount}
          merchantClaimCount={merchantClaimCount}
          totalOrderValue={totalOrderValue}
          totalRefundedValue={totalRefundedValue}
          merchantRefundRate={merchantRefundRate}
          openClaimCount={openClaimCount}
          latestClaim={latestClaim}
        />
      </div>
    </div>
    </PageConnectionGate>
  );
}
