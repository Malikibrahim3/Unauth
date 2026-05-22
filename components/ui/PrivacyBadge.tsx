import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBadgeProps {
  value: string;
  className?: string;
}

export function PrivacyBadge({ value, className }: PrivacyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-1',
        'border-privacy-border bg-privacy-fill text-privacy-ink t-label',
        className,
      )}
    >
      <Shield className="h-3 w-3" aria-hidden="true" />
      <span>{value}</span>
    </span>
  );
}
