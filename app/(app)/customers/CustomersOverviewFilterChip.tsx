import Link from 'next/link';

export function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[var(--ua-radius-xs)] border transition-colors hover:bg-[var(--ua-surface-primary)]"
      style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-primary)', background: 'var(--ua-surface-selected)' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}
