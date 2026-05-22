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
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3"
        style={{
          background: 'var(--surface-overlay)',
          borderBottom: '1px solid var(--surface-border)',
          padding: '9px 14px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-primary)',
              lineHeight: 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: 1,
                background: 'var(--copper-bright)',
                marginRight: 7,
                verticalAlign: '1px',
              }}
            />
            {title}
          </div>
          {description && (
              <p
              className="mt-1 truncate"
              style={{ fontSize: 11, color: 'var(--ink-secondary)' }}
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
