'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CLAIM_TYPE_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import { formatClaimMoney } from '@/components/claims/claimReviewStyles';
import { StatusPill } from '@/components/claims/claimReviewPrimitives';
import { Select } from '@/components/ui';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { caseDisplay } from '@/lib/ui/displayRef';
import { label } from '@/lib/ui/labels';
import { formatDateAbsolute, formatDateTime } from '@/lib/utils/format';
import { DetailPageShell } from '@/components/workbench/DetailPageShell';

export function ClaimReviewHeader({
  wb,
  children,
}: {
  wb: ClaimReviewWorkbench;
  children: ReactNode;
}) {
  const { selectedClaim, history, claimId, customerName, customerProfileHref } = wb;
  const identity = selectedClaim
    ? caseDisplay({
        customer_name: customerName,
        ref: selectedClaim.order_ref ?? selectedClaim.shopify_order_id ?? null,
        id: selectedClaim.id,
      })
    : customerName || 'Case';
  const caseType = selectedClaim?.claim_type
    ? CLAIM_TYPE_LABELS[selectedClaim.claim_type] ?? selectedClaim.claim_type
    : 'Case';
  const openedAt = selectedClaim?.created_at ?? selectedClaim?.submitted_at ?? null;
  const recordNav = wb.state.nextClaimHref
    ? { nextHref: wb.state.nextClaimHref, nextLabel: 'Next review' }
    : undefined;

  return (
    <DetailPageShell
      backHref="/claims"
      backLabel="Back to cases"
      eyebrow={caseType}
      title={identity}
      subtitle={selectedClaim
        ? `Requested action: ${
            selectedClaim.requested_action && selectedClaim.requested_action !== 'unknown'
              ? label('requestedAction', selectedClaim.requested_action)
              : 'Not specified'
          }`
        : 'Loading case context…'}
      statusBadge={selectedClaim ? <StatusPill status={selectedClaim.status} /> : undefined}
      meta={selectedClaim ? [
        ...(selectedClaim.amount_at_risk != null && selectedClaim.currency
          ? [{
              label: 'Value at issue',
              value: formatClaimMoney(selectedClaim.amount_at_risk, selectedClaim.currency),
            }]
          : []),
        {
          label: 'Owner',
          value: selectedClaim.assigned_to ? 'Assigned' : 'Unassigned',
        },
        ...(openedAt ? [{ label: 'Opened', value: formatDateAbsolute(openedAt) }] : []),
        ...(selectedClaim.updated_at
          ? [{ label: 'Updated', value: formatDateTime(selectedClaim.updated_at) }]
          : []),
      ] : undefined}
      actions={(
        <Link
          href={customerProfileHref}
          className="ua-text-label inline-flex h-8 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-[var(--ua-text-primary)]"
        >
          Customer profile
        </Link>
      )}
      recordNav={recordNav}
    >
      {history.length > 1 ? (
        <label className="ua-text-label block max-w-sm text-[var(--ua-text-secondary)]">
          Switch case
          <Select
            aria-label="Switch case"
            className="mt-1"
            value={claimId}
            onChange={(event) => wb.setClaimId(event.target.value)}
          >
            {history.map((item) => (
              <option key={item.id} value={item.id}>
                {caseDisplay({
                  customer_name: customerName,
                  ref: item.order_ref ?? item.shopify_order_id,
                  id: item.id,
                })} · {STATUS_LABELS[item.status] ?? item.status}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {children}
    </DetailPageShell>
  );
}
