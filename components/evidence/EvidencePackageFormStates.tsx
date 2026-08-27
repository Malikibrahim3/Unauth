import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { TriangleAlert } from 'lucide-react';

type EvidencePackageFormIntroProps = {
  showIntro: boolean;
};

export function EvidencePackageFormIntro({ showIntro }: EvidencePackageFormIntroProps) {
  if (showIntro) {
    return (
      <>
        <h2 className="ua-text-section-title mb-1">Package scope</h2>
        <p className="text-body-sm mb-2" style={{ color: 'var(--uo-route-text-secondary)' }}>
          Organises identity signal data from your records that may be relevant when preparing a chargeback
          response. Unauth surfaces the signal history - your payment processor or acquirer determines what
          qualifies as valid dispute evidence.
        </p>
        <p
          className="text-caption mb-3 rounded-[var(--uo-route-radius-control)] border px-3 py-2"
          style={{ color: 'var(--uo-route-text-tertiary)', borderColor: 'var(--uo-route-border-subtle)', background: 'var(--uo-route-surface-secondary)' }}
        >
          This export presents identity match data for your review. How you use it in a dispute is at your
          discretion - follow your acquirer or processor guidelines.
        </p>
      </>
    );
  }

  return (
    <p className="text-body-sm mb-4" style={{ color: 'var(--uo-route-text-secondary)' }}>
      Select the disputed order and optional notes. Unauth compiles identity signal data for your review.
    </p>
  );
}

type EvidencePackageFormLoadingStateProps = {
  loadingOrders: boolean;
};

export function EvidencePackageFormLoadingState({ loadingOrders }: EvidencePackageFormLoadingStateProps) {
  if (!loadingOrders) return null;

  return (
    <div
      data-state-id="evidence-package-builder-loading"
      role="status"
      aria-busy="true"
      aria-label="Loading order history"
      className="rounded-[var(--uo-route-radius-control)] p-5 text-center"
      style={{ background: 'var(--uo-route-surface-secondary)', border: '1px solid var(--uo-route-border-subtle)' }}
    >
      <Spinner size="lg" delayMs={0} label="Loading order history" className="mb-3" />
      <p className="text-body-sm" style={{ color: 'var(--uo-route-text-secondary)' }}>
        Loading order history…
      </p>
    </div>
  );
}

type EvidencePackageFormEmptyOrdersProps = {
  profileId: string;
  loadingOrders: boolean;
  hasOrders: boolean;
  onCancel?: () => void;
};

export function EvidencePackageFormEmptyOrders({
  profileId,
  loadingOrders,
  hasOrders,
  onCancel,
}: EvidencePackageFormEmptyOrdersProps) {
  if (loadingOrders || hasOrders) return null;

  return (
    <div
      data-state-id="evidence-package-no-orders"
      className="rounded-[var(--uo-route-radius-control)] p-5 text-center"
      style={{ background: 'var(--uo-route-surface-secondary)', border: '1px solid var(--uo-route-border-subtle)' }}
    >
      <p className="text-heading-sm mb-2" style={{ color: 'var(--uo-route-text-primary)' }}>
        No orders found
      </p>
      <p className="text-body-sm mb-4" style={{ color: 'var(--uo-route-text-secondary)' }}>
        This customer has no order history in the current dataset. Evidence packages require at least one order.
      </p>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="ua-text-label hover:underline" style={{ color: 'var(--uo-route-action-primary)' }}>
          Close
        </button>
      ) : (
        <Link href={`/customers/${profileId}`} className="ua-text-label hover:underline" style={{ color: 'var(--uo-route-action-primary)' }}>
          Return to profile
        </Link>
      )}
    </div>
  );
}

type EvidencePackageFormNoClaimsBannerProps = {
  loadingOrders: boolean;
  hasOrders: boolean;
  hasEligibleOrders: boolean;
};

export function EvidencePackageFormNoClaimsBanner({
  loadingOrders,
  hasOrders,
  hasEligibleOrders,
}: EvidencePackageFormNoClaimsBannerProps) {
  if (loadingOrders || !hasOrders || hasEligibleOrders) return null;

  return (
    <div
      data-state-id="evidence-package-no-qualifying-cases"
      className="mb-3 flex items-start gap-3 rounded-[var(--uo-route-radius-control)] p-3"
      style={{ background: 'var(--uo-route-warning-bg)', border: '1px solid var(--uo-route-warning-border)' }}
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--uo-route-warning)]" aria-hidden="true" />
      <div>
        <p className="ua-text-working-title mb-0.5" style={{ color: 'var(--uo-route-text-primary)' }}>
          No refund claims or chargebacks on record
        </p>
        <p className="text-caption" style={{ color: 'var(--uo-route-text-secondary)' }}>
          Signal data is most complete when a refund claim is on record. You can still compile a signal report for
          any order.
        </p>
      </div>
    </div>
  );
}
