import Link from 'next/link';

type EvidencePackageFormIntroProps = {
  showIntro: boolean;
};

export function EvidencePackageFormIntro({ showIntro }: EvidencePackageFormIntroProps) {
  if (showIntro) {
    return (
      <>
        <h1 className="text-heading-lg mb-1" style={{ color: 'var(--text)' }}>
          Build evidence package
        </h1>
        <p className="text-body-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Organises identity signal data from your records that may be relevant when preparing a chargeback
          response. Unauth surfaces the signal history - your payment processor or acquirer determines what
          qualifies as valid dispute evidence.
        </p>
        <p
          className="text-caption mb-8 rounded-md border px-3 py-2"
          style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}
        >
          This export presents identity match data for your review. How you use it in a dispute is at your
          discretion - follow your acquirer or processor guidelines.
        </p>
      </>
    );
  }

  return (
    <p className="text-body-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
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
      className="rounded-md p-8 text-center"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-muted)' }}
    >
      <div
        className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
      />
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
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
      className="rounded-md p-8 text-center"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-muted)' }}
    >
      <p className="text-heading-sm mb-2" style={{ color: 'var(--text)' }}>
        No orders found
      </p>
      <p className="text-body-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        This customer has no order history in the current dataset. Evidence packages require at least one order.
      </p>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          Close
        </button>
      ) : (
        <Link href={`/customers/${profileId}`} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
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
      className="mb-6 flex items-start gap-3 rounded-md p-4"
      style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-bd)' }}
    >
      <span style={{ color: 'var(--warning)' }}>⚠</span>
      <div>
        <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
          No refund claims or chargebacks on record
        </p>
        <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
          Signal data is most complete when a refund claim is on record. You can still compile a signal report for
          any order.
        </p>
      </div>
    </div>
  );
}
