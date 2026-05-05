import { writeFileSync } from 'fs';

const inboxContent = `import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import InboxClient from '@/components/inbox/InboxClient';
import TrackPageView from '@/components/common/TrackPageView';

export default async function InboxPage() {
  const supabase = createClient();

  const { data: flagged } = await supabase
    .from('transactions')
    .select('id, order_id, match_score, risk_level, processed_at, processing_job_id, customer_profile_id')
    .in('risk_level', ['high', 'critical'])
    .is('dismissed_at', null)
    .is('merchant_feedback', null)
    .order('match_score', { ascending: false })
    .limit(50);

  const items = (flagged ?? []) as unknown as Array<{
    id: string;
    order_id: string;
    match_score: number;
    risk_level: string;
    processed_at: string;
    processing_job_id: string;
    customer_profile_id: string | null;
  }>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            High and critical transactions awaiting review
          </p>
        </div>
        <Link href="/upload" className="btn-accent px-4 py-2 text-sm font-semibold rounded-md transition-colors">
          New Audit
        </Link>
      </div>
      <InboxClient initialItems={items} />
      <TrackPageView event="Inbox Viewed" properties={{ pendingCount: items.length }} />
    </div>
  );
}
`;

const teamContent = `import { redirect } from 'next/navigation';

export default function TeamSettingsPage() {
  redirect('/settings');
}
`;

const auditTrailContent = `import { redirect } from 'next/navigation';

export default function AuditTrailSettingsPage() {
  redirect('/settings');
}
`;

writeFileSync('/Users/malikibrahim/Downloads/Unauth/app/(app)/inbox/page.tsx', inboxContent);
writeFileSync('/Users/malikibrahim/Downloads/Unauth/app/(app)/settings/team/page.tsx', teamContent);
writeFileSync('/Users/malikibrahim/Downloads/Unauth/app/(app)/settings/audit-trail/page.tsx', auditTrailContent);

console.log('All 3 files written successfully');
