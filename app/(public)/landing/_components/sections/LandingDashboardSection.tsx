import Reveal from '../Reveal';
import { ProductFrame } from '../ui/ProductFrame';
import { Tag } from '../ui/Tag';

const MOBILE_DASHBOARD_STATS = [
  ['$8.8k', 'order value linked'],
  ['4', 'customers to review'],
  ['292', 'transactions analysed'],
  ['6', 'evidence packets ready'],
] as const;

const DASHBOARD_ANNOTATIONS = [
  { label: 'Value at risk', x: '6%', y: '16%' },
  { label: 'Match breakdown', x: '6%', y: '62%' },
];

export function LandingDashboardSection() {
  return (
    <>
      <section
        id="evidence"
        className="ua-section-dark-band"
        suppressHydrationWarning
        style={{ background: 'var(--landing-graphite)' }}
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr] gap-8 md:gap-12 items-center">
            <Reveal delay={40}>
              <p className="ua-landing-section-eyebrow" style={{ color: 'var(--landing-dark-warm)' }}>
                04 — Evidence workspace
              </p>
              <h2
                className="ua-landing-section-title"
                style={{ color: 'var(--landing-dark-bright)' }}
              >
                Claim confidence and evidence, in one merchant workspace.
              </h2>
              <p
                className="ua-landing-section-body"
                style={{ color: 'var(--landing-dark-text)' }}
              >
                Identity patterns, confidence grades, claims history, evidence packs, and thresholded
                network signals — merchant-controlled review, not auto-blocks.
              </p>

              <div className="flex flex-wrap gap-2 mt-6">
                <Tag variant="info">Evidence-ready output</Tag>
                <Tag variant="info">Hashed audit trail</Tag>
                <Tag variant="info">Tenant-scoped</Tag>
              </div>
            </Reveal>

            <Reveal delay={120}>
              {/* Mobile: stat cards */}
              <div className="grid grid-cols-2 gap-2 sm:hidden">
                {MOBILE_DASHBOARD_STATS.map(([value, label]) => (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--landing-dark-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 13px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-dm-mono, monospace)',
                        fontSize: '22px',
                        fontWeight: 500,
                        color: 'var(--landing-dark-bright)',
                        lineHeight: 1,
                        marginBottom: 4,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {value}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-dm-sans, sans-serif)',
                        fontSize: '12px',
                        color: 'var(--landing-dark-text)',
                        margin: 0,
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop: product frame */}
              <div className="hidden sm:block" style={{ boxShadow: 'var(--ua-shadow-xl)', borderRadius: 'var(--radius-lg)' }}>
                <ProductFrame
                  src="/screenshots/dashboard.png"
                  alt="Unauth merchant dashboard showing claim metrics, transaction volume, chargeback trend, and identity match breakdown"
                  chrome="browser"
                  annotations={DASHBOARD_ANNOTATIONS}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}
