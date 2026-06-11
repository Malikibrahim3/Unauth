import Link from 'next/link';

export function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[3px] border transition-colors hover:bg-[var(--surface)]"
      style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--copper-glow)' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}
