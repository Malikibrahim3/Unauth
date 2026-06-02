'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrivacyBadge } from './PrivacyBadge';

interface SensitiveFieldProps {
  label: string;
  masked: string;
  full?: string | null;
  canReveal?: boolean;
  className?: string;
}

export function SensitiveField({
  label,
  masked,
  full,
  canReveal = false,
  className,
}: SensitiveFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const display = revealed && full ? full : masked;
  const canToggle = canReveal && !!full && full !== masked;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
        {!revealed && <PrivacyBadge value="PII masked" />}
        {revealed && (
          <span
            className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs uppercase leading-none"
            style={{
              background: 'var(--risk-medium-bg)',
              borderColor: 'var(--risk-medium-line)',
              color: 'var(--risk-medium-fg)',
              letterSpacing: '0.04em',
            }}
          >
            revealed
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{display}</span>
        {canToggle && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              outlineColor: 'var(--accent)',
            }}
            aria-pressed={revealed}
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
          >
            {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
      </div>
    </div>
  );
}
