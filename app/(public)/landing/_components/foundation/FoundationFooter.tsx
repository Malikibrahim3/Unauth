import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { FL_FOOTER, FL_ROUTES } from '../../_lib/foundationContent';

export default function FoundationFooter() {
  return (
    <footer data-nav-theme="light" id="privacy" className="bg-white border-t border-black/[0.07]">
      <div className="mx-auto w-full max-w-[100rem] px-5 pt-14 pb-10 sm:px-10">

        {/* Top grid: brand column + link columns */}
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">

          {/* Brand */}
          <div>
            <Link href="/landing" prefetch={false} aria-label="Unauth home" className="inline-flex">
              <UnauthLogo kind="lockup" tone="graphite" height={20} alt="" decorative />
            </Link>
            <p className="mt-4 max-w-[240px] text-[13px] leading-[1.65] tracking-[-0.01em] text-black/44">
              {FL_FOOTER.tagline}
            </p>
            <Link
              href={FL_ROUTES.audit}
              prefetch={false}
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.13] px-4 text-[13px] font-semibold tracking-[-0.02em] text-black/68 transition hover:border-black/28 hover:text-black"
            >
              Create workspace
            </Link>
          </div>

          {/* Link columns */}
          {FL_FOOTER.columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/36">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) =>
                  link.href.startsWith('#') || link.href.startsWith('/landing#') ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[14px] tracking-[-0.015em] text-black/52 transition hover:text-black"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="text-[14px] tracking-[-0.015em] text-black/52 transition hover:text-black"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.07] pt-6">
          <div className="space-y-1">
            <p className="font-mono text-[11px] text-black/30">
              {FL_FOOTER.legal}
            </p>
            <p className="font-mono text-[11px] text-black/30">
              {FL_FOOTER.legalRules}
            </p>
          </div>
          <p className="font-mono text-[11px] text-black/30">
            © {new Date().getFullYear()} Unauth
          </p>
        </div>

      </div>
    </footer>
  );
}
