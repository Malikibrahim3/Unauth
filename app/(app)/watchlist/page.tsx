import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ButtonLink, SectionCard, WorkbenchPage } from '@/components/ui';

export default function WatchlistPage() {
  return (
    <WorkbenchPage
      eyebrow="Legacy route"
      title="Customer watchlists are retired"
      subtitle="Unauth now keeps follow-up context case-scoped. Use Claims for active review and Evidence packages for documented exports."
      actions={
        <ButtonLink href="/claims" variant="primary">
          Open claims
        </ButtonLink>
      }
      main={
        <SectionCard
          title="Why this changed"
          description="Guardrails against reusable customer surveillance"
          density="compact"
        >
          <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
              <Link href="/claims" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Open claims
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/chargebacks" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Open evidence packages
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Return to dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </SectionCard>
      }
    />
  );
}
