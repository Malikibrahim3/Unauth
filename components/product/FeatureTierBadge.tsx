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
        'text-[11px] font-medium leading-4 text-[#64686d] leading-none',
        'bg-[#f4f3f1] text-[#6f6a63]',
        className,
      )}
    >
      {getFeatureAccessLabel(entitlement)}
    </span>
  );
}
