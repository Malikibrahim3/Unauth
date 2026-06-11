import { NETWORK } from '../_lib/content';
import NetworkGraphCanvas from './NetworkGraphCanvas';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

/**
 * The network is the product: graph on one side, the three structural
 * claims (gating, density, day-one context) ruled beneath the copy.
 */
export default function NetworkSection() {
  return (
    <section id="network" className="border-y border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <SectionHeader
                eyebrow={NETWORK.eyebrow}
                headline={NETWORK.headline}
                body={NETWORK.body}
              />
            </Reveal>
            <div className="mt-10 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
              {NETWORK.points.map((point, i) => (
                <Reveal key={point.title} delay={i * 80}>
                  <div className="grid gap-2 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                    <h3 className="text-[0.9375rem] font-semibold text-[var(--ink-primary)]">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
                      {point.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={120}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-2">
              <div className="h-[22rem] sm:h-[26rem]">
                <NetworkGraphCanvas />
              </div>
              <p className="border-t border-[var(--border-subtle)] px-4 py-3 font-mono text-[0.6875rem] text-[var(--ink-tertiary)]">
                one hashed identity · 5 merchants · pseudonymous, k-gated
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
