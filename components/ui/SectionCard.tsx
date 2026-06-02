import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  density?: 'default' | 'compact';
  id?: string;
  className?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  density = 'default',
  id,
  className,
}: SectionCardProps) {
  const bodyPadding = density === 'compact' ? 'p-3' : 'p-4';

  return (
    <section
      id={id}
      className={cn('overflow-hidden', className)}
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3"
        style={{
          borderBottom: '1px solid var(--surface-border)',
          padding: '10px 14px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {description && (
              <p
              className="mt-1 truncate"
              style={{ fontSize: 12, color: 'var(--ink-secondary)' }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Body */}
      <div className={bodyPadding}>{children}</div>
    </section>
  );
}
