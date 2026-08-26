import { ENTITLEMENT_META, getFeatureAccessLabel, type Entitlement } from '@/lib/product/entitlements';

export function UpgradeCard({ entitlement }: { entitlement: Entitlement }) {
  const meta = ENTITLEMENT_META[entitlement];
  return (
    <div
      className="rounded-md border p-6 space-y-3"
      style={{ borderColor: 'var(--uo-route-border-subtle)', background: 'var(--uo-route-surface-primary)' }}
    >
      <p
        className="text-[length:var(--uo-route-text-metadata-size)] font-medium leading-[var(--uo-route-text-metadata-leading)]"
        style={{ color: 'var(--uo-route-text-secondary)' }}
      >
        {getFeatureAccessLabel(entitlement)}
      </p>
      <h3 className="text-heading-sm" style={{ color: 'var(--uo-route-text-primary)' }}>
        {meta.label}
      </h3>
      <p className="text-body-sm" style={{ color: 'var(--uo-route-text-secondary)' }}>
        {meta.availability === 'future'
          ? 'This is on the product roadmap and is not yet available. Contact us if you\'d like early access.'
          : 'Available on a higher plan. Upgrade from billing settings or contact hello@unauth.co.'}
      </p>
    </div>
  );
}
