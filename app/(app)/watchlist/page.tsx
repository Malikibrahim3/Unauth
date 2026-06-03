import Link from 'next/link';
import { PageHeader, SectionCard } from '@/components/ui';

export default function WatchlistPage() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        eyebrow="Legacy route"
        title="Customer watchlists are retired"
        subtitle="Unauth now keeps follow-up context case-scoped. Use Claims for active review and Evidence packages for documented exports."
        className="rounded-lg"
      />

      <SectionCard
        title="Why this changed"
        description="Guardrails against reusable customer surveillance"
        density="compact"
      >
        <div className="space-y-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>
            Unauth answers case questions and unlocks context for a specific review event. It does
            not support permanent customer watchlists, reusable denial lists, or customer-level
            monitoring queues.
          </p>
          <p>
            Network context remains available through monthly context credits, and raw cross-merchant
            customer data is never exposed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/claims" className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Open claims →
            </Link>
            <Link href="/chargebacks" className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Open evidence packages →
            </Link>
            <Link href="/dashboard" className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Return to dashboard →
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
