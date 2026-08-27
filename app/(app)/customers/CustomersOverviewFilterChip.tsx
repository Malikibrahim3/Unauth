import Link from 'next/link';

export function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[var(--uo-route-radius-xs)] border transition-colors hover:bg-[var(--uo-route-surface-primary)]"
      style={{ borderColor: 'var(--uo-route-border-default)', color: 'var(--uo-route-text-primary)', background: 'var(--uo-route-surface-selected)' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}
