'use client';

import { useMemo } from 'react';
import CaseSummaryStrip from '@/components/customers/CaseSummaryStrip';
import { CustomerIntelligenceDrawerCaseCard } from '@/components/customers/CustomerIntelligenceDrawerCaseCard';
import {
  CustomerIntelligenceDrawerEvidenceCta,
  CustomerIntelligenceDrawerNarrativeSection,
  CustomerIntelligenceDrawerNotesSection,
  CustomerIntelligenceDrawerStoredIdentity,
} from '@/components/customers/CustomerIntelligenceDrawerFooter';
import { getDrawerFooterProps } from '@/components/customers/customerIntelligenceDrawerUtils';
import { CustomerIntelligenceDrawerHistorySection } from '@/components/customers/CustomerIntelligenceDrawerHistorySection';
import { CustomerIntelligenceDrawerIdentitySection } from '@/components/customers/CustomerIntelligenceDrawerIdentitySection';
import { CustomerIntelligenceDrawerReviewStatus } from '@/components/customers/CustomerIntelligenceDrawerReviewStatus';
import { StatTile } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';
import { CustomerIntelligenceDrawerVerdict } from '@/components/customers/CustomerIntelligenceDrawerVerdict';
import type { DrawerProfile } from '@/components/customers/customerIntelligenceDrawerUtils';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { getEventStream } from '@/lib/analysis/customerIntelligence';
import { formatCurrencyNullable, formatDate } from '@/lib/utils/format';
import type { CustomerIntelligenceDrawerUiAction } from '@/components/customers/customerIntelligenceDrawerReducer';

export function CustomerIntelligenceDrawerContent({
  panel,
  ordersExpanded,
  dispatchUi,
}: {
  panel: CustomerIntelligencePanel;
  ordersExpanded: boolean;
  dispatchUi: React.Dispatch<CustomerIntelligenceDrawerUiAction>;
}) {
  const { profile, orderHistory, identityTimeline, linkedAccounts, narrative } = panel;
  const drawerProfile = profile as DrawerProfile;
  const variantCount = identityTimeline.filter((e) => e.isVariant).length;
  const totalOrderValue =
    Number(drawerProfile.commerce_total_value ?? 0) ||
    orderHistory.reduce((sum, o) => sum + (o.orderValue ?? 0), 0);
  const totalRefundValue = orderHistory.reduce((sum, o) => sum + (o.refundAmount ?? 0), 0);
  const claimCount = orderHistory.filter(
    (o) => o.refundRequested || o.returnRequested || o.chargebackFiled,
  ).length;
  const hasCleanRecord = claimCount === 0 && drawerProfile.total_chargebacks === 0;
  const displayName = drawerProfile.names[0] ?? drawerProfile.primary_email ?? 'Unknown customer';
  const { hasProfileId, isEligibleForEvidence, disputedOrder, identitySignals } = getDrawerFooterProps(
    drawerProfile,
    orderHistory,
  );

  const density = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => 0);
    for (const order of orderHistory) {
      const diffDays = Math.floor((Date.now() - new Date(order.processedAt).getTime()) / 86400000);
      const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
      buckets[weekIndex] += 1;
    }
    return buckets;
  }, [orderHistory]);

  const roadmapEvents = useMemo(
    () =>
      getEventStream({
        orderHistory,
        identityTimeline,
        linkedAccounts: linkedAccounts.map((acc) => ({
          entityType: acc.entityType,
          entityValue: acc.entityValue,
          confidence: acc.confidence,
        })),
      }),
    [identityTimeline, linkedAccounts, orderHistory],
  );

  function openEvidenceCompile() {
    if (!hasProfileId) return;
    dispatchUi({ type: 'open_evidence', orderId: disputedOrder?.transactionId });
  }

  return (
    <div>
      <CustomerIntelligenceDrawerVerdict
        profile={drawerProfile}
        linkedCount={linkedAccounts.length}
        variantCount={variantCount}
        hasCleanRecord={hasCleanRecord}
      />
      <CustomerIntelligenceDrawerCaseCard
        profile={drawerProfile}
        linkedAccounts={linkedAccounts}
        claimCount={claimCount}
        variantCount={variantCount}
        displayName={displayName}
      />
      {hasProfileId ? <CustomerIntelligenceDrawerReviewStatus profile={drawerProfile} /> : null}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatTile
          label="Total spend"
          value={formatCurrencyNullable(totalOrderValue) ?? '—'}
          hint={`${drawerProfile.total_orders} orders`}
        />
        <StatTile
          label="Refund rate"
          value={`${Math.round(drawerProfile.refund_rate * 100)}%`}
          hint={totalRefundValue > 0 ? formatCurrencyNullable(totalRefundValue) ?? undefined : undefined}
        />
        <StatTile
          label="First seen"
          value={formatDate(drawerProfile.first_seen)}
          hint={`Last seen ${formatDate(drawerProfile.last_seen)}`}
        />
      </div>
      <CustomerIntelligenceDrawerNarrativeSection
        narrative={narrative}
        hasCleanRecord={hasCleanRecord}
        identitySignals={identitySignals}
      />
      {!hasCleanRecord ? (
        <CaseSummaryStrip
          flaggedAt={drawerProfile.first_seen}
          orders={drawerProfile.total_orders}
          exposure={totalOrderValue}
          cadence={Math.min(5, Math.max(1, Math.ceil(drawerProfile.total_orders / 3)))}
          lastSeen={drawerProfile.last_seen}
          density={density}
        />
      ) : null}
      {!hasCleanRecord ? (
        <CustomerIntelligenceDrawerHistorySection
          orderHistory={orderHistory}
          ordersExpanded={ordersExpanded}
          onToggleOrders={() => dispatchUi({ type: 'toggle_orders' })}
          roadmapEvents={roadmapEvents}
        />
      ) : null}
      <CustomerIntelligenceDrawerIdentitySection
        identityTimeline={identityTimeline}
        linkedAccounts={linkedAccounts}
        lastSeen={drawerProfile.last_seen}
      />
      <CustomerIntelligenceDrawerStoredIdentity profile={drawerProfile} />
      {hasProfileId ? <CustomerIntelligenceDrawerNotesSection profileId={drawerProfile.id} /> : null}
      <CustomerIntelligenceDrawerEvidenceCta
        hasProfileId={hasProfileId}
        isEligibleForEvidence={isEligibleForEvidence}
        onBuildEvidence={openEvidenceCompile}
      />
    </div>
  );
}
