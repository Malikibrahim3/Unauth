import { ENTITLEMENT_META, getFeatureAccessLabel, type Entitlement } from '@/lib/product/entitlements';

export function UpgradeCard({ entitlement }: { entitlement: Entitlement }) {
  const meta = ENTITLEMENT_META[entitlement];
  return (
    <div
      className="rounded-lg border p-6 space-y-3"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      <p className="text-overline" style={{ color: 'var(--text-muted)' }}>
        {getFeatureAccessLabel(entitlement)}
      </p>
      <h3 className="text-heading-sm" style={{ color: 'var(--text)' }}>
        {meta.label}
      </h3>
      <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
        {meta.availability === 'future'
          ? 'This is on the product roadmap and is not yet available. Contact us if you\'d like early access.'
          : 'Available on a higher plan. Upgrade from billing settings or contact hello@unauth.co.'}
      </p>
    </div>
  );
}
