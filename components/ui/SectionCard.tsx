import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  density?: 'default' | 'compact';
  id?: string;
  className?: string;
  style?: CSSProperties;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  density = 'default',
  id,
  className,
  style,
}: SectionCardProps) {
  const bodyPadding = density === 'compact' ? 'p-3' : 'p-4';

  return (
    <section
      id={id}
      className={cn('overflow-hidden', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-1)',
        ...style,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3"
        style={{
          borderBottom: '1px solid var(--border-muted)',
          padding: 'var(--space-3) var(--space-4)',
        }}
      >
        <div>
          <div className="text-h3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          {description && (
            <p
              className="mt-1 truncate text-small"
              style={{ color: 'var(--text-secondary)' }}
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
      <div className={cn(bodyPadding, 'bg-[var(--surface)]')}>{children}</div>
    </section>
  );
}
