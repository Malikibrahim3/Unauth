import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import FoundationFooter from '../landing/_components/foundation/FoundationFooter';
import FoundationNav from '../landing/_components/foundation/FoundationNav';
import styles from '../landing/_components/foundation/foundation.module.css';

export const metadata: Metadata = {
  title: 'Pricing | Unauth',
  description:
    'Simple usage-based pricing for Unauth identity checks, network context, and helpdesk evidence review.',
};

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: '200 credits/mo',
    estimate: '~100 network checks',
    features: [
      '1 user',
      'Own-store + network context included',
      'Gorgias and Zendesk widget',
      'Docs and community support',
    ],
    cta: 'Start free',
    href: '/signup',
    recommended: false,
    order: 'order-2 lg:order-none',
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/mo',
    credits: '4,000 credits/mo',
    estimate: '~2,000 network checks',
    features: [
      'Up to 3 users',
      'Full network context + evidence summaries',
      'All helpdesk widgets (Gorgias, Zendesk, Freshdesk)',
      'API access',
      'Email support',
    ],
    cta: 'Start free trial',
    note: '7-day trial, no card',
    href: '/signup',
    recommended: true,
    order: 'order-1 lg:order-none',
  },
  {
    name: 'Growth',
    price: '$399',
    period: '/mo',
    credits: '20,000 credits/mo',
    estimate: '~10,000 network checks',
    features: [
      'Unlimited users',
      'Everything in Pro',
      'Bulk export',
      'Dedicated onboarding',
      'Priority support',
    ],
    cta: 'Talk to us',
    href: '/audit',
    recommended: false,
    order: 'order-3 lg:order-none',
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: '',
    credits: 'Custom credit allowance',
    estimate: 'Volume pricing',
    features: [
      'Custom integrations',
      'Dedicated CSM',
      'SLA guarantees',
      'Volume pricing on credits',
    ],
    cta: 'Contact sales',
    href: '/audit',
    recommended: false,
    order: 'order-4 lg:order-none',
  },
];

const creditRows = [
  ['Own-store context only', '1 credit'],
  ['Full network context', '2 credits'],
  ['Evidence summary + deeper review', '3 credits'],
];

export default function PricingPage() {
  return (
    <div className="overflow-x-clip bg-[var(--fl-dusk-3)] font-sans text-[var(--fl-ink)]">
      <FoundationNav />
      <main>
        <section className="relative isolate overflow-hidden border-b border-[rgba(246,243,238,0.16)] bg-[var(--fl-dusk-3)]">
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-[url('/pricing-background-mnovk2-cutout.png')] bg-[length:min(88rem,145vw)_auto] bg-[position:center_top_5rem] bg-no-repeat opacity-55 mix-blend-screen sm:bg-[position:center_top_3rem] lg:bg-[length:min(96rem,110vw)_auto]"
          />
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-[radial-gradient(70%_45%_at_50%_12%,rgba(196,149,106,0.18)_0%,rgba(44,30,18,0)_62%),linear-gradient(180deg,rgba(26,24,20,0.12)_0%,rgba(44,30,18,0.68)_45%,#2c1e12_100%)]"
          />
          <div className="relative z-10 mx-auto flex w-full max-w-[100rem] flex-col px-5 pb-14 pt-28 sm:px-10 lg:pb-20 lg:pt-36">
            <header className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div className="max-w-[46rem]">
          <p className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.04em] text-[rgba(246,243,238,0.68)]">
            Pricing
          </p>
          <h1 className={`${styles.displayHowItWorks} mt-5`} style={{ color: 'var(--fl-dusk-ink)' }}>
            Simple, usage-based pricing
          </h1>
              </div>
          <p className="mt-7 max-w-[38rem] text-[1.125rem] leading-[1.55] text-[rgba(246,243,238,0.76)] sm:text-[1.25rem]">
            Run a check on every suspicious ticket. Pay only for what you use.
          </p>
        </header>

            <div className="mt-14 grid grid-cols-1 gap-3 lg:mt-16 lg:grid-cols-4">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`${tier.order} flex h-full min-h-[34rem] flex-col rounded-md border ${
                tier.recommended
                  ? 'border-[var(--fl-ink)] bg-[var(--fl-paper)] shadow-[var(--fl-shadow-card)]'
                  : 'border-[rgba(229,222,206,0.74)] bg-[rgba(253,252,251,0.86)] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.45)] backdrop-blur-sm'
              } p-6 sm:p-7`}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-[1.125rem] font-bold text-[var(--fl-ink)]">{tier.name}</h2>
                {tier.recommended ? (
                  <span className="rounded-full bg-[var(--fl-ink)] px-3 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--fl-paper)]">
                    Recommended
                  </span>
                ) : null}
              </div>

              <div className="mt-8">
                <p className="font-mono text-[2.75rem] font-medium leading-none tracking-normal text-[var(--fl-ink)]">
                  {tier.price}
                  {tier.period ? (
                    <span className="align-baseline text-[1rem] text-[var(--fl-ink-tertiary)]">
                      {tier.period}
                    </span>
                  ) : null}
                </p>
                <p className="mt-5 font-mono text-[0.9375rem] font-medium text-[var(--fl-ink)]">
                  {tier.credits}
                </p>
                <p className="mt-1 text-[0.875rem] text-[var(--fl-ink-tertiary)]">
                  {tier.estimate}
                </p>
              </div>

              <ul className="mt-8 flex flex-1 flex-col gap-3 border-t border-[var(--fl-line)] pt-6 text-left text-[0.9375rem] leading-snug text-[var(--fl-ink-secondary)]">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden
                      size={15}
                      strokeWidth={2}
                      className="mt-0.5 shrink-0 text-[var(--fl-ink-tertiary)]"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={tier.href}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[0.9375rem] font-semibold transition-colors ${
                    tier.recommended
                      ? 'bg-[var(--fl-ink)] text-[var(--fl-paper)] hover:bg-[#2c1e12]'
                      : 'border border-[var(--fl-line)] bg-[var(--fl-paper)] text-[var(--fl-ink)] hover:border-[var(--fl-ink)]'
                  }`}
                >
                  {tier.cta}
                  <ArrowUpRight size={15} aria-hidden />
                </Link>
                {tier.note ? (
                  <p className="mt-3 text-center text-[0.8125rem] text-[var(--fl-ink-tertiary)]">
                    {tier.note}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
            </div>

            <details className="mt-6 rounded-md border border-[rgba(246,243,238,0.18)] bg-[rgba(253,252,251,0.9)] px-5 py-4 text-[0.9375rem] text-[var(--fl-ink-secondary)] shadow-[0_20px_52px_-32px_rgba(0,0,0,0.55)] backdrop-blur-sm open:pb-5 sm:px-6">
          <summary className="cursor-pointer select-none text-[1rem] font-semibold text-[var(--fl-ink)]">
            How credits work
          </summary>
          <div className="mt-5 max-w-[56rem]">
            <p className="leading-[1.6]">
              Each time you run an identity check on a ticket, it costs credits depending on
              the depth of context requested:
            </p>
            <div className="mt-5 overflow-hidden rounded-md border border-[var(--fl-line)] bg-[var(--fl-paper)]">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[rgba(26,24,20,0.035)] text-[0.75rem] uppercase tracking-[0.04em] text-[var(--fl-ink-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Check type</th>
                    <th className="px-4 py-3 font-bold">Credits used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fl-line)]">
                  {creditRows.map(([type, credits]) => (
                    <tr key={type}>
                      <td className="px-4 py-3">{type}</td>
                      <td className="px-4 py-3 font-mono font-medium text-[var(--fl-ink)]">
                        {credits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 leading-[1.6]">
              Credits reset monthly. Unused credits do not roll over. Additional credit packs
              can be purchased on Pro and Growth tiers if you exceed your monthly allowance
              before the next cycle.
            </p>
          </div>
        </details>

            <p className="mt-7 text-[1rem] text-[rgba(246,243,238,0.76)]">
          Using Gorgias?{' '}
          <Link
            href="/landing#how-it-works"
            className="font-semibold text-[var(--fl-dusk-ink)] underline decoration-[rgba(246,243,238,0.34)] decoration-1 underline-offset-4 transition-colors hover:text-white"
          >
            See how it works as an add-on <ArrowUpRight size={14} aria-hidden className="inline" />
          </Link>
        </p>
          </div>
        </section>
      </main>
      <FoundationFooter />
    </div>
  );
}
