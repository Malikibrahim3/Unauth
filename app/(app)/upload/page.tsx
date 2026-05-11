import UploadClient from '@/components/upload/UploadClient';
import { PageHeader } from '@/components/common/PageHeader';

interface UploadPageProps {
  searchParams: { welcome?: string };
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const isWelcome = sp.welcome === '1';
  return (
    <div className="p-8 max-w-3xl">
      {isWelcome && (
        <div
          className="mb-6 rounded-[var(--radius-3)] px-5 py-4"
          style={{ background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-line)' }}
        >
          <p className="text-h3" style={{ color: 'var(--risk-low-fg)' }}>Welcome to Unauth — your account is set up.</p>
          <p className="text-caption mt-0.5" style={{ color: 'var(--risk-low-fg)' }}>
            Upload your first order export below to run identity matching.
          </p>
        </div>
      )}
      <div className="mb-[var(--space-5)]">
        <PageHeader title="New Audit" subtitle="Upload a CSV export of your orders to detect identity matches and repeated claim patterns." />
      </div>
      <UploadClient />
    </div>
  );
}
