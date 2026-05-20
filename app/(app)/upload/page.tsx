import UploadClient from '@/components/upload/UploadClient';
import Link from 'next/link';
import { Button, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui';

interface UploadPageProps {
  searchParams: { welcome?: string };
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const isWelcome = sp.welcome === '1';
  return (
    <WorkbenchPage
      title="New Audit"
      subtitle="Upload a CSV export of your orders to detect identity matches and repeated claim patterns."
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="audits"
      actions={<Link href="/history"><Button variant="secondary" size="sm">View History</Button></Link>}
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Step', value: '01 Upload', hint: 'Start with source CSV' },
            { label: 'Max file', value: '50 MB', hint: 'Current limit' },
            { label: 'Max rows', value: '100k', hint: 'Per file' },
            { label: 'Flow', value: 'Map -> Process', hint: 'Column mapping included' },
            { label: 'Output', value: 'Audit run', hint: 'Creates review queue' },
          ]}
        />
      }
      main={
        <div className="p-4 lg:max-w-4xl">
          {isWelcome && (
            <div
              className="mb-6 rounded-[var(--radius-2)] px-5 py-4"
              style={{ background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-line)' }}
            >
              <p className="text-h3" style={{ color: 'var(--risk-low-fg)' }}>Welcome to Unauth — your account is set up.</p>
              <p className="text-caption mt-0.5" style={{ color: 'var(--risk-low-fg)' }}>
                Upload your first order export below to run identity matching.
              </p>
            </div>
          )}
          <UploadClient />
        </div>
      }
    />
  );
}
