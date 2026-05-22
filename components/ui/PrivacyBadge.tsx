import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBadgeProps {
  value?: string;
  className?: string;
}

export function PrivacyBadge({ value = 'k-safe', className }: PrivacyBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none', className)}
      style={{
        background: 'var(--privacy-fill)',
        borderColor: 'var(--privacy-border)',
        color: 'var(--privacy-ink)',
        letterSpacing: '0.04em',
      }}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      {value}
    </span>
  );
}
