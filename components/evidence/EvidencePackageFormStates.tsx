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
        <h2 className="font-semibold text-[14px] leading-5 text-[#1c1f23] mb-1">Package scope</h2>
        <p className="text-body-sm mb-2" style={{ color: '#64686d' }}>
          Organises identity signal data from your records that may be relevant when preparing a chargeback
          response. Unauth surfaces the signal history - your payment processor or acquirer determines what
          qualifies as valid dispute evidence.
        </p>
        <p
          className="text-caption mb-3 rounded-[8px] border px-3 py-2"
          style={{ color: '#6f6a63', borderColor: '#eae8e5', background: '#f4f3f1' }}
        >
          This export presents identity match data for your review. How you use it in a dispute is at your
          discretion - follow your acquirer or processor guidelines.
        </p>
      </>
    );
  }

  return (
    <p className="text-body-sm mb-4" style={{ color: '#64686d' }}>
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
      className="rounded-[8px] p-5 text-center"
      style={{ background: '#f4f3f1', border: '1px solid #eae8e5' }}
    >
      <Spinner size="lg" delayMs={0} label="Loading order history" className="mb-3" />
      <p className="text-body-sm" style={{ color: '#64686d' }}>
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
      className="rounded-[8px] p-5 text-center"
      style={{ background: '#f4f3f1', border: '1px solid #eae8e5' }}
    >
      <p className="text-heading-sm mb-2" style={{ color: '#1c1f23' }}>
        No orders found
      </p>
      <p className="text-body-sm mb-4" style={{ color: '#64686d' }}>
        This customer has no order history in the current dataset. Evidence packages require at least one order.
      </p>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="text-[11px] font-medium leading-4 text-[#64686d] hover:underline" style={{ color: '#9f4f08' }}>
          Close
        </button>
      ) : (
        <Link href={`/customers/${profileId}`} className="text-[11px] font-medium leading-4 text-[#64686d] hover:underline" style={{ color: '#9f4f08' }}>
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
      className="mb-3 flex items-start gap-3 rounded-[8px] p-3"
      style={{ background: '#fff3e9', border: '1px solid #ead8b6' }}
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#7a5310]" aria-hidden="true" />
      <div>
        <p className="font-medium text-[13px] leading-5 text-[#1c1f23] mb-0.5" style={{ color: '#1c1f23' }}>
          No refund claims or chargebacks on record
        </p>
        <p className="text-caption" style={{ color: '#64686d' }}>
          Signal data is most complete when a refund claim is on record. You can still compile a signal report for
          any order.
        </p>
      </div>
    </div>
  );
}
