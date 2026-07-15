import { PageConnectionGate } from '@/components/connections/PageConnectionGate';
import { CustomerProfilePageHero } from '@/app/(app)/customers/[id]/CustomerProfilePageHero';
import { CustomerProfilePageMainColumn } from '@/app/(app)/customers/[id]/CustomerProfilePageMainColumn';
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
    viewToken,
    gorgiasSource,
    gorgiasTicketId,
    profile,
    displayName,
    hasCleanRecord,
    merchantClaimCount,
    merchantChargebackCount,
    merchantOrderCount,
    localClaimRatePct,
    totalOrderValue,
    totalRefundedValue,
    displayCurrency,
    transactions,
    identityTimeline,
    variantCount,
    merchantNarrative,
    linkedAccounts,
    activityLog,
    openClaimCount,
  } = props;

  return (
    <PageConnectionGate requires="both" connection={connectionState} pageName="Customer payout history" pageDescription="This profile shows customer order history and linked support payout cases from merchant-owned sources. An incomplete profile can be misleading - you may see orders with no case history when helpdesk data is not syncing yet." hasData={true}>
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <CustomerProfilePageHero
        displayName={displayName}
        profile={profile}
        hasCleanRecord={hasCleanRecord}
        merchantClaimCount={merchantClaimCount}
        merchantChargebackCount={merchantChargebackCount}
        merchantOrderCount={merchantOrderCount}
        localClaimRatePct={localClaimRatePct}
        viewToken={viewToken}
        openClaimCount={openClaimCount}
        totalOrderValue={totalOrderValue}
        totalRefundedValue={totalRefundedValue}
        displayCurrency={displayCurrency}
        gorgiasSource={gorgiasSource}
        gorgiasTicketId={gorgiasTicketId}
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
      <div className="grid grid-cols-1 gap-[var(--space-6)]">
        <CustomerProfilePageMainColumn
          profile={profile}
          hasCleanRecord={hasCleanRecord}
          merchantOrderCount={merchantOrderCount}
          merchantNarrative={merchantNarrative}
          transactions={transactions}
          identityTimeline={identityTimeline}
          variantCount={variantCount}
          linkedAccounts={linkedAccounts}
          activityLog={activityLog}
        />
      </div>
    </div>
    </PageConnectionGate>
  );
}
