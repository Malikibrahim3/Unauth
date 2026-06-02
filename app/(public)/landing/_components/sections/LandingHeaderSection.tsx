import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { t } from '../../_tokens';
export function LandingHeaderSection() {
  return (
    <>
      {/* ── Header strip ────────────────────────────────────────── */}
      <header className="ua-landing-sticky-header py-4">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <UnauthLogo variant="wordmark-light" size={28} />
            <nav className="ua-landing-nav-links hidden md:flex items-center gap-7">
              <Link href="#how-it-works" className="ua-nav-link">How it works</Link>
              <Link href="#network" className="ua-nav-link">Network</Link>
              <Link href="#evidence" className="ua-nav-link">Evidence</Link>
              <Link href="#security" className="ua-nav-link">Security</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="ua-landing-nav-signin hover:underline">
              Sign in
            </Link>
            <Link href="/audit" className="ua-landing-cta-sm md:hidden hover:bg-[var(--landing-accent-hover)]">
              Audit →
            </Link>
            <Link href="/audit" className="ua-landing-cta-md hidden md:inline-flex hover:bg-[var(--landing-accent-hover)]">
              Run free audit →
            </Link>
          </div>
        </div>
      </header>

    </>
  );
}
