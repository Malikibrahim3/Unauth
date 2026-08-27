import { getFeatureAccessLabel, type Entitlement } from '@/lib/product/entitlements';
import { cn } from '@/lib/utils';

export function FeatureTierBadge({
  entitlement,
  className,
}: {
  entitlement: Entitlement;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5',
        'ua-text-label leading-none',
        'bg-[var(--uo-route-surface-muted)] text-[var(--uo-route-text-tertiary)]',
        className,
      )}
    >
      {getFeatureAccessLabel(entitlement)}
    </span>
  );
}
