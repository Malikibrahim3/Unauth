import Reveal from '../Reveal';
import { LANDING_PRIVACY_NETWORK_COPY } from '../../landingPageConstants';

function KAnonymityDiagram() {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: 380, display: 'block' }}
    >
      {/* Merchant nodes */}
      {[
        { cx: 60, cy: 60, label: 'Store A' },
        { cx: 160, cy: 30, label: 'Store B' },
        { cx: 260, cy: 60, label: 'Store C' },
      ].map(({ cx, cy, label }) => (
        <g key={label}>
          <circle cx={cx} cy={cy} r={22} fill="var(--landing-cream-2)" stroke="var(--landing-border)" strokeWidth={1.5} />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="var(--landing-ink-tertiary)" fontFamily="var(--font-dm-sans,sans-serif)" fontWeight={600}>
            {label}
          </text>
        </g>
      ))}

      {/* Lines to threshold node */}
      {[{ x1: 60, y1: 82, x2: 158, y2: 126 }, { x1: 160, y1: 52, x2: 160, y2: 126 }, { x1: 260, y1: 82, x2: 162, y2: 126 }].map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--landing-border)" strokeWidth={1} strokeDasharray="4 3" />
      ))}

      {/* k-anonymity threshold node */}
      <circle cx={160} cy={138} r={32} fill="var(--landing-accent)" opacity={0.1} />
      <circle cx={160} cy={138} r={20} fill="var(--landing-accent)" />
      <text x={160} y={134} textAnchor="middle" fontSize={8} fill="white" fontFamily="var(--font-dm-sans,sans-serif)" fontWeight={700}>k ≥ 3</text>
      <text x={160} y={147} textAnchor="middle" fontSize={7} fill="white" fontFamily="var(--font-dm-sans,sans-serif)">threshold</text>

      {/* Output signal node */}
      <line x1={160} y1={158} x2={160} y2={186} stroke="var(--landing-accent)" strokeWidth={1.5} />
      <rect x={110} y={186} width={100} height={26} rx={4} fill="var(--landing-accent)" opacity={0.12} stroke="var(--landing-accent)" strokeWidth={1} />
      <text x={160} y={203} textAnchor="middle" fontSize={9} fill="var(--landing-accent)" fontFamily="var(--font-dm-sans,sans-serif)" fontWeight={700}>
        Network signal
      </text>

      {/* Blocked path label for Store B alone */}
      <text x={250} y={130} textAnchor="middle" fontSize={8} fill="var(--landing-ink-faint)" fontFamily="var(--font-dm-sans,sans-serif)">
        No single
      </text>
      <text x={250} y={141} textAnchor="middle" fontSize={8} fill="var(--landing-ink-faint)" fontFamily="var(--font-dm-sans,sans-serif)">
        merchant
      </text>
      <text x={250} y={152} textAnchor="middle" fontSize={8} fill="var(--landing-ink-faint)" fontFamily="var(--font-dm-sans,sans-serif)">
        exposed
      </text>
    </svg>
  );
}

export function LandingNetworkSection() {
  return (
    <>
      <section id="network" className="ua-section-quiet mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal delay={40}>
            <p className="ua-landing-section-eyebrow">05 — Network &amp; privacy</p>
            <h2 className="ua-landing-section-title">
              Own-store now. Thresholded network when density exists.
            </h2>
            <p className="ua-landing-section-body mt-4 max-w-xl">
              {LANDING_PRIVACY_NETWORK_COPY}
            </p>
          </Reveal>
          <Reveal delay={120} className="flex justify-center lg:justify-end">
            <KAnonymityDiagram />
          </Reveal>
        </div>
      </section>
      <hr className="ua-landing-hr-faint" />
    </>
  );
}
