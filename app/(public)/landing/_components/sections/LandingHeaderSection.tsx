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
              <Link href="#integrations" className="ua-nav-link">Integrations</Link>
              <Link href="#workflow" className="ua-nav-link">Workflow</Link>
              <Link href="#evidence" className="ua-nav-link">Evidence</Link>
              <Link href="#pricing" className="ua-nav-link">Pricing</Link>
              <Link href="#faq" className="ua-nav-link">FAQ</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="ua-landing-nav-signin hover:underline">
              Sign in
            </Link>
            <Link href="/signup" className="ua-landing-cta-sm md:hidden hover:bg-[var(--landing-accent-hover)]">
              Start →
            </Link>
            <Link href="/signup" className="ua-landing-cta-md hidden md:inline-flex hover:bg-[var(--landing-accent-hover)]">
              Create workspace →
            </Link>
          </div>
        </div>
      </header>

    </>
  );
}
