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
        'text-[10px] font-semibold uppercase tracking-wide leading-none',
        'bg-[var(--surface-muted)] text-[var(--ink-tertiary)]',
        className,
      )}
    >
      {getFeatureAccessLabel(entitlement)}
    </span>
  );
}
