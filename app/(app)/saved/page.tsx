import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { WorkbenchEmptyState, WorkbenchPage } from '@/components/ui';

export default function SavedViewsPage() {
  return (
    <WorkbenchPage
      title="Saved Views"
      subtitle="Reusable filtered views across clusters, cases, and audits."
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="clusters"
      main={
        <div className="p-4">
          <div className="rounded-lg border" style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
            <WorkbenchEmptyState
              title="No saved views yet"
              description="Save a filtered customer, case, or audit view and it will appear here."
              action={
                <div className="flex items-center gap-3">
                  <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse customers
                  </Link>
                  <Link href="/inbox" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse cases
                  </Link>
                  <Link href="/history" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse audits
                  </Link>
                </div>
              }
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-caption" style={{ color: 'var(--text-subtle)' }}>
            <BookMarked className="h-4 w-4" />
            <span>Saved views are coming soon for cross-route query presets.</span>
          </div>
        </div>
      }
    />
  );
}
