import Link from 'next/link';
import { ShieldCheck, ListChecks, UserSearch, Network, Check } from 'lucide-react';
import Reveal from '../Reveal';
import { Lift } from '../ui/Lift';
import { Tag } from '../ui/Tag';
import { Cta } from '../ui/Cta';
import {
  LANDING_BILLING_TRANSPARENCY,
  LANDING_PRICING_TIERS,
} from '../../landingPageConstants';
import { CONTEXT_CREDIT_COSTS } from '@/lib/billing/contextCredits';

const OUTCOME_MODULES = [
  {
    icon: ShieldCheck,
    title: 'Store context',
    body: 'Order, claim, delivery, and customer history from your own store on day one.',
    proof: 'Immediate value even before network density builds',
  },
  {
    icon: ListChecks,
    title: 'Case review workflow',
    body: 'Work claims in support with neutral context checks and evidence workflows.',
    proof: 'Every plan includes helpdesk/widget presence',
  },
  {
    icon: UserSearch,
    title: 'Case-scoped context',
    body: 'Unlock context for a specific review event instead of building reusable customer watchlists.',
    proof: 'Credits unlock review context, not permanent surveillance',
  },
  {
    icon: Network,
    title: 'Pseudonymous network context',
    body: 'Thresholded cross-merchant signals with raw customer data kept private.',
    proof: 'Network context available across plans through credits',
  },
] as const;

const PRICING_BULLETS: Record<string, readonly string[]> = {
  unauth: ['100 context credits / month', 'Widget and helpdesk presence', 'Store + pseudonymous network context via credits', 'Baseline access aligned with network participation', 'Limited history depth', 'No API / bulk workflows'],
  pro: ['1,000 context credits / month', 'Deeper store + pseudonymous network context', 'Case Reports and standard exports', 'Six months of network history', 'Single-store focus', 'Top-up: £15 for 200 credits (self-serve)'],
  growth: ['5,000 context credits / month', 'High-volume claim review', 'Multi-store support (standard)', 'Twenty-four months of network history', 'Advanced aggregate reporting', 'Priority support'],
  scale: ['Dedicated monthly volume agreed at onboarding', 'Case-scoped API / bulk workflows where enabled', 'Security review and onboarding', 'Custom reporting and integrations'],
};

const CREDIT_ACTION_ROWS = [
  ['Store Check', `${CONTEXT_CREDIT_COSTS.basic_context} credit`],
  ['Network Check (store + pseudonymous network)', `${CONTEXT_CREDIT_COSTS.full_context} credits`],
  ['Case Report', `${CONTEXT_CREDIT_COSTS.evidence_summary} credits`],
] as const;

export function LandingProductTierSection() {
  return (
    <>
      <section className="ua-section-flow mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28">
        <Reveal delay={40}>
          <p className="ua-landing-section-eyebrow">02 — What Unauth does</p>
          <h2 className="ua-landing-section-title">
            What you get once your sources are connected.
          </h2>
          <p className="ua-landing-section-body max-w-2xl">
            Every plan includes the core review surface. Monthly context credits control how much
            store and pseudonymous network context your team unlocks.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {OUTCOME_MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.title} delay={80 + i * 60}>
                <Lift>
                  <article
                    className="ua-outcome-card"
                    style={{ boxShadow: 'var(--ua-shadow-md)', height: '100%' }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--landing-cream)',
                        border: '1px solid var(--landing-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                        color: 'var(--landing-accent)',
                      }}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <h3 className="ua-outcome-card-title">{m.title}</h3>
                    <p className="ua-outcome-card-body">{m.body}</p>
                    <p className="ua-outcome-card-proof">
                      <span className="ua-outcome-card-proof-dot" aria-hidden="true" />
                      {m.proof}
                    </p>
                  </article>
                </Lift>
              </Reveal>
            );
          })}
        </div>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}


export function LandingPricingSection() {
  return (
    <>
      <section id="pricing" className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28">
        <Reveal delay={40}>
          <p className="ua-landing-section-eyebrow">06 — Pricing</p>
          <h2 className="ua-landing-section-title">Context-credit pricing</h2>
          <p className="ua-landing-section-body text-sm max-w-3xl mb-8" style={{ color: 'var(--landing-ink-muted)' }}>
            Every plan includes the Unauth widget, store context, and pseudonymous network context. Usage is controlled by monthly context credits.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANDING_PRICING_TIERS.map((row) => {
              const isFeatured = row.key === 'pro';
              return (
                <Lift key={row.key}>
                  <div
                    className="ua-pricing-card"
                    style={{
                      boxShadow: isFeatured ? 'var(--ua-shadow-lg)' : 'var(--ua-shadow-sm)',
                      border: isFeatured
                        ? '1px solid var(--landing-accent)'
                        : '1px solid var(--landing-border)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isFeatured && (
                      <div style={{ marginBottom: 10 }}>
                        <Tag variant="status-live" showDot>Most popular</Tag>
                      </div>
                    )}
                    <p className="ua-pricing-card-name">{row.name}</p>
                    <p className="ua-pricing-card-price">{row.price}</p>
                    {row.priceNote ? (
                      <p className="ua-pricing-card-note">{row.priceNote}</p>
                    ) : null}
                    <ul className="ua-pricing-card-list">
                      {(PRICING_BULLETS[row.key] ?? []).map((b) => (
                        <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <Check
                            size={13}
                            strokeWidth={2.5}
                            style={{
                              color: 'var(--landing-accent)',
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Lift>
              );
            })}
          </div>

          <div
            className="mt-8 rounded-2xl border p-5 md:p-6"
            style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-cream)' }}
          >
            <p className="ua-landing-section-eyebrow" style={{ marginBottom: 10 }}>How credits work</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--landing-ink-muted)' }}>
                    <th className="pb-2 text-left font-semibold">Context action</th>
                    <th className="pb-2 text-right font-semibold">Credit cost</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_ACTION_ROWS.map(([label, cost]) => (
                    <tr key={label} className="border-t" style={{ borderColor: 'var(--landing-border)' }}>
                      <td className="py-3 text-left" style={{ color: 'var(--landing-ink)' }}>{label}</td>
                      <td className="py-3 text-right font-semibold" style={{ color: 'var(--landing-accent)' }}>{cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm" style={{ color: 'var(--landing-ink-muted)' }}>
              A basic check uses your own store data. A full check adds pseudonymous network context from participating merchants. Credits unlock case-scoped context for claim, order, or ticket review.
            </p>
          </div>

          <p className="mt-6 text-xs italic" style={{ color: 'var(--landing-ink-tertiary)' }}>
            {LANDING_BILLING_TRANSPARENCY}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/signup" variant="primary">Create workspace →</Cta>
            <Cta href="/demo" variant="secondary">View demo</Cta>
          </div>
        </Reveal>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}
