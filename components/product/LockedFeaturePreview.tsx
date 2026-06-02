import type { ReactNode } from 'react';

export function LockedFeaturePreview({ children }: { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden="true">
        {children ?? (
          <div className="h-32 bg-[var(--bg-subtle)]" />
        )}
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, var(--bg-surface) 55%, transparent)' }}
      >
        <p className="text-body-sm font-medium px-4 text-center" style={{ color: 'var(--text)' }}>
          Preview only — upgrade to access this feature
        </p>
      </div>
    </div>
  );
}
