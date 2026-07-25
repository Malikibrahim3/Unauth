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
        'text-[length:var(--ua-text-micro-size)] font-semibold leading-none',
        'bg-[var(--ua-surface-muted)] text-[var(--ua-text-tertiary)]',
        className,
      )}
    >
      {getFeatureAccessLabel(entitlement)}
    </span>
  );
}
