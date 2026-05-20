import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface FilterChipProps {
  children: ReactNode;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function FilterChip({ children, active = false, onRemove, onClick, className }: FilterChipProps) {
  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={cn(
        'inline-flex items-center gap-1 text-caption',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        height: 24,
        paddingLeft: 8,
        paddingRight: onRemove ? 4 : 8,
        borderRadius: 3,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'border-color 120ms, background 120ms, color 120ms',
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove filter"
          className="flex items-center justify-center rounded-sm hover:opacity-70 transition-opacity"
          style={{ width: 14, height: 14, padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        >
          <X size={10} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
