import Image from 'next/image';
import Reveal from '../Reveal';

const MOBILE_DASHBOARD_STATS = [
  ['$8.8k', 'order value linked'],
  ['4', 'customers to review'],
  ['292', 'transactions analysed'],
  ['6', 'evidence packets ready'],
] as const;

export function LandingDashboardSection() {
  return (
    <>
      <section className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>
        <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr] gap-8 md:gap-12 items-center">
          <Reveal delay={40}>
            <p className="ua-landing-section-eyebrow">
              § 4 - MERCHANT DASHBOARD
            </p>
            <h2 className="ua-landing-section-title">
              Claim confidence and evidence,{' '}
              <span className="ua-landing-section-title-italic">
                in one merchant workspace.
              </span>
            </h2>
            <p className="ua-landing-section-body">
              Identity patterns, confidence grades, claims history, evidence packs, and thresholded network signals — merchant-controlled review, not auto-blocks.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              {MOBILE_DASHBOARD_STATS.map(([value, label]) => (
                <div key={label} className="ua-landing-mobile-stat-card">
                  <p className="ua-landing-mobile-stat-value">{value}</p>
                  <p className="ua-landing-mobile-stat-label">{label}</p>
                </div>
              ))}
            </div>
            <div className="ua-hover-glow ua-landing-dashboard-frame hidden sm:block">
              <Image
                src="/screenshots/dashboard.png"
                alt="Unauth merchant dashboard showing claim metrics, transaction volume, chargeback trend, and identity match breakdown"
                width={2880}
                height={1800}
                className="ua-landing-dashboard-img"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="ua-landing-hr-faint" />

    </>
  );
}
