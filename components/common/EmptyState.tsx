import { type ReactNode } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string };
  icon?: ReactNode;
}

export function EmptyState({ title, description, primaryAction, secondaryAction, icon }: EmptyStateProps) {
  return (
    <div
      className="rounded-xl px-6 py-8 text-center border space-y-3"
      style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
    >
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="text-caption max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {primaryAction.label}
              </Link>
            ) : (
              <button
                onClick={primaryAction.onClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {primaryAction.label}
              </button>
            )
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href ?? '#'}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
