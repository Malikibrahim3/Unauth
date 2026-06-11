import { cn } from '@/lib/utils';
import { TIER_LABELS, type ProductTier } from '@/lib/product/tiers';

export function PlanBadge({
  tier,
  label,
  future,
  devAccess,
  className,
}: {
  tier: ProductTier;
  /** Override display text, e.g. "Evidence" or "Network". */
  label?: string;
  future?: boolean;
  devAccess?: boolean;
  className?: string;
}) {
  const tierText = label ?? TIER_LABELS[tier];
  const text = devAccess
    ? 'Dev access'
    : future
      ? `${tierText} · Future`
      : tierText;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide leading-none',
        'bg-[var(--surface-sunken)] text-[var(--text-tertiary)]',
        className,
      )}
    >
      {text}
    </span>
  );
}
