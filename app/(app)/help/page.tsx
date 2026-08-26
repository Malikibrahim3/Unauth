import Link from 'next/link';
import { PageFrame } from '@/components/ui';
import { HelpCentre } from '@/components/help/HelpCentre';

export default async function HelpIndexPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams?.q ?? '').trim().slice(0, 100);
  return (
    <PageFrame
      title="Help centre"
      subtitle="Current task-shaped guides for activation, source repair, Work, Cases, external handoff, recovery, reconciliation, roles, privacy, and API access."
      actions={<Link href="mailto:support@unauth.app" className="ua-button ua-button--secondary ua-button--sm">Contact support</Link>}
      surfaceId="help-index"
      archetype="P11"
    >
      <HelpCentre initialQuery={query} />
    </PageFrame>
  );
}
