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
        background: '#f4f3f1',
        borderColor: '#e4e3e0',
        color: '#40454a',
        letterSpacing: '0.04em',
      }}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      {value}
    </span>
  );
}
