import { ENTITLEMENT_META, getFeatureAccessLabel, type Entitlement } from '@/lib/product/entitlements';

export function UpgradeCard({ entitlement }: { entitlement: Entitlement }) {
  const meta = ENTITLEMENT_META[entitlement];
  return (
    <div
      className="rounded-md border p-6 space-y-3"
      style={{ borderColor: '#eae8e5', background: '#fff' }}
    >
      <p
        className="text-[length:10.5px] font-medium leading-[1.4]"
        style={{ color: '#64686d' }}
      >
        {getFeatureAccessLabel(entitlement)}
      </p>
      <h3 className="text-heading-sm" style={{ color: '#1c1f23' }}>
        {meta.label}
      </h3>
      <p className="text-body-sm" style={{ color: '#64686d' }}>
        {meta.availability === 'future'
          ? 'This is on the product roadmap and is not yet available. Contact us if you\'d like early access.'
          : 'Available on a higher plan. Upgrade from billing settings or contact hello@unauth.co.'}
      </p>
    </div>
  );
}
