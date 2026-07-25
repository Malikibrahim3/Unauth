import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBadgeProps {
  value?: string;
  className?: string;
}

export function PrivacyBadge({ value = 'Privacy-safe', className }: PrivacyBadgeProps) {
  return (
    <span
      title="Cross-store comparisons use hashed identifiers only. No other merchant can see your customer list."
      className={cn('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium leading-none', className)}
      style={{
        background: 'var(--ua-privacy-bg)',
        borderColor: 'var(--ua-privacy-border)',
        color: 'var(--ua-privacy)',
        letterSpacing: '0.04em',
      }}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      {value}
    </span>
  );
}
