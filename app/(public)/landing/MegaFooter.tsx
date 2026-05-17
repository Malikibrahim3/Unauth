'use client';

import { UnauthLogo } from '@/components/ui/UnauthLogo';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };

const NAV_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works',   href: '#section-how' },
      { label: 'Network graph',  href: '#section-pattern' },
      { label: 'Security',       href: '#section-security' },
      { label: 'API reference',  href: '/docs/api' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation',  href: '/docs' },
      { label: 'Data handling',  href: '/legal/data-handling' },
      { label: 'DPA',            href: '/legal/dpa' },
      { label: 'Status',         href: '/status' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',          href: '/about' },
      { label: 'Press',          href: '/press' },
      { label: 'Contact',        href: 'mailto:hello@unauth.app' },
      { label: 'Legal',          href: '/legal' },
    ],
  },
];

interface MegaFooterProps {
  todayISO: string;
}

export function MegaFooter({ todayISO }: MegaFooterProps) {
  return (
    <footer
      style={{
        background: '#F4F0E8',
        borderTop: '1px solid #D8D0BD',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          maxWidth: '1080px',
          padding: '64px 40px 40px',
        }}
      >
        {/* Top grid: brand + nav columns */}
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8"
          style={{ marginBottom: '56px' }}
        >
          {/* Brand mark */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <UnauthLogo variant="light" size="footer" />
            </div>
            <p
              style={{
                ...SANS,
                fontSize: '13px',
                color: '#6A6050',
                lineHeight: 1.65,
                maxWidth: '200px',
                margin: 0,
              }}
            >
              The fraud intelligence network for ecommerce.
            </p>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map(({ heading, links }) => (
            <div key={heading}>
              <p
                style={{
                  ...MONO,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: '#4A4640',
                  fontWeight: 600,
                  marginBottom: '18px',
                }}
              >
                {heading}
              </p>
              {links.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    ...SANS,
                    fontSize: '13px',
                    color: '#6A6050',
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: '11px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1A1814'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6A6050'; }}
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg, transparent 0%, #D8D0BD 15%, #D8D0BD 85%, transparent 100%)',
            marginBottom: '28px',
          }}
        />

        {/* Bottom row */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div
            style={{
              ...SANS,
              fontSize: '12px',
              color: '#8A8472',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>© 2026 Unauth</span>
            {[
              { label: 'Privacy',       href: '/legal/privacy' },
              { label: 'DPA',           href: '/legal/dpa' },
              { label: 'Data handling', href: '/legal/data-handling' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{ color: '#8A8472', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
              >
                {label}
              </a>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <a
              href="mailto:hello@unauth.app"
              style={{
                ...MONO,
                fontSize: '11px',
                color: '#8A8472',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1A1814'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A8472'; }}
            >
              hello@unauth.app
            </a>
            <span
              style={{
                ...MONO,
                fontSize: '11px',
                color: '#B0A898',
              }}
            >
              Issue 04 · {todayISO}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
