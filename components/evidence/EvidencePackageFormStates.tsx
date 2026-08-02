import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';

type EvidencePackageFormIntroProps = {
  showIntro: boolean;
};

export function EvidencePackageFormIntro({ showIntro }: EvidencePackageFormIntroProps) {
  if (showIntro) {
    return (
      <>
        <h1 className="text-heading-lg mb-1" style={{ color: 'var(--ua-text-primary)' }}>
          Build evidence package
        </h1>
        <p className="text-body-sm mb-2" style={{ color: 'var(--ua-text-secondary)' }}>
          Organises identity signal data from your records that may be relevant when preparing a chargeback
          response. Unauth surfaces the signal history - your payment processor or acquirer determines what
          qualifies as valid dispute evidence.
        </p>
        <p
          className="text-caption mb-3 rounded-[var(--ua-radius-control)] border px-3 py-2"
          style={{ color: 'var(--ua-text-tertiary)', borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-secondary)' }}
        >
          This export presents identity match data for your review. How you use it in a dispute is at your
          discretion - follow your acquirer or processor guidelines.
        </p>
      </>
    );
  }

  return (
    <p className="text-body-sm mb-4" style={{ color: 'var(--ua-text-secondary)' }}>
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
      className="rounded-[var(--ua-radius-control)] p-5 text-center"
      style={{ background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-subtle)' }}
    >
      <Spinner size="lg" delayMs={0} label="Loading order history" className="mb-3" />
      <p className="text-body-sm" style={{ color: 'var(--ua-text-secondary)' }}>
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
      className="rounded-[var(--ua-radius-control)] p-5 text-center"
      style={{ background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-subtle)' }}
    >
      <p className="text-heading-sm mb-2" style={{ color: 'var(--ua-text-primary)' }}>
        No orders found
      </p>
      <p className="text-body-sm mb-4" style={{ color: 'var(--ua-text-secondary)' }}>
        This customer has no order history in the current dataset. Evidence packages require at least one order.
      </p>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="ua-text-label hover:underline" style={{ color: 'var(--ua-action-primary)' }}>
          Close
        </button>
      ) : (
        <Link href={`/customers/${profileId}`} className="ua-text-label hover:underline" style={{ color: 'var(--ua-action-primary)' }}>
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
      className="mb-3 flex items-start gap-3 rounded-[var(--ua-radius-control)] p-3"
      style={{ background: 'var(--ua-warning-bg)', border: '1px solid var(--ua-warning-border)' }}
    >
      <span style={{ color: 'var(--ua-warning)' }}>⚠</span>
      <div>
        <p className="ua-text-working-title mb-0.5" style={{ color: 'var(--ua-text-primary)' }}>
          No refund claims or chargebacks on record
        </p>
        <p className="text-caption" style={{ color: 'var(--ua-text-secondary)' }}>
          Signal data is most complete when a refund claim is on record. You can still compile a signal report for
          any order.
        </p>
      </div>
    </div>
  );
}
