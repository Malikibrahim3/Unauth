import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export function LegalHeader() {
  return (
    <header className="border-b border-black/[0.08] bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/landing" aria-label="Unauth home" className="inline-flex">
          <UnauthLogo kind="lockup" tone="graphite" height={22} alt="" decorative />
        </Link>
        <nav aria-label="Legal navigation" className="flex items-center gap-4 text-sm text-black/60">
          <Link href="/landing" className="transition hover:text-black">Home</Link>
          <Link href="/login" className="transition hover:text-black">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
