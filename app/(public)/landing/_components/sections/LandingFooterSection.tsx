import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { FOOTER_STYLES_ESPRESSO } from '../../landingPageConstants';

export function LandingFooterSection({ todayISO }: { todayISO: string }) {
  return (
    <footer style={{ background: FOOTER_STYLES_ESPRESSO.shellBg, borderTop: `1px solid ${FOOTER_STYLES_ESPRESSO.shellBorder}` }}>
      <div
        className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-14"
        style={{
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: '13px',
          color: FOOTER_STYLES_ESPRESSO.text,
        }}
      >
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <UnauthLogo variant="wordmark-dark" size={24} />
            <p style={{ margin: '10px 0 0', lineHeight: 1.65, maxWidth: '42ch' }}>
              Risk intelligence for dispute-heavy commerce teams. We turn raw transaction logs into
              case-ready evidence and customer-level risk context in one workflow.
            </p>
            <p
              style={{
                margin: '14px 0 0',
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '12px',
                color: FOOTER_STYLES_ESPRESSO.link,
              }}
            >
              Version issue-04 · build date {todayISO}
            </p>
          </div>

          <div>
            <p style={{ margin: 0, color: FOOTER_STYLES_ESPRESSO.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Product</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/audit" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Audit portal</Link>
              <Link href="/signup" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Book a pilot</Link>
              <Link href="/demo" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Interactive demo</Link>
            </div>
          </div>

          <div>
            <p style={{ margin: 0, color: FOOTER_STYLES_ESPRESSO.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Trust & legal</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/legal/privacy" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Privacy notice</Link>
              <Link href="/legal/dpa" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Data Processing Addendum</Link>
              <Link href="/legal/data-handling" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Data handling</Link>
              <Link href="/legal/pilot-terms" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">Pilot terms</Link>
            </div>
          </div>

          <div>
            <p style={{ margin: 0, color: FOOTER_STYLES_ESPRESSO.heading, fontWeight: 600, letterSpacing: '0.02em' }}>Contact</p>
            <div className="mt-3 flex flex-col gap-2">
              <a href="mailto:hello@unauth.co" style={{ color: FOOTER_STYLES_ESPRESSO.link }} className="hover:underline">hello@unauth.co</a>
              <span style={{ color: FOOTER_STYLES_ESPRESSO.link }}>London, UK</span>
              <span style={{ color: FOOTER_STYLES_ESPRESSO.link }}>Support window: Mon-Fri, 09:00-18:00 GMT</span>
            </div>
          </div>
        </div>

        <div
          className="mt-10 pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          style={{
            borderTop: `1px solid ${FOOTER_STYLES_ESPRESSO.shellBorder}`,
            background: FOOTER_STYLES_ESPRESSO.bottomBg,
            marginInline: FOOTER_STYLES_ESPRESSO.bottomBg === 'transparent' ? 0 : '-24px',
            paddingInline: FOOTER_STYLES_ESPRESSO.bottomBg === 'transparent' ? 0 : '24px',
            paddingBlock: FOOTER_STYLES_ESPRESSO.bottomBg === 'transparent' ? 0 : '18px',
          }}
        >
          <p style={{ margin: 0, fontStyle: 'italic', fontFamily: 'var(--font-serif, serif)', fontSize: '12px' }}>
            Case files, audit outputs, and network figures shown on this page are illustrative examples only.
          </p>
          <span style={{ color: FOOTER_STYLES_ESPRESSO.link }}>© 2026 Unauth. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
