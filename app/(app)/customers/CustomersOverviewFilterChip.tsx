import Link from '@/components/navigation/AppNavLink';

export function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[5px] border transition-colors hover:bg-[#fff]"
      style={{ borderColor: '#e4e3e0', color: '#1c1f23', background: '#fff3e9' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}
