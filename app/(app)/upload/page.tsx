import UploadClient from '@/components/upload/UploadClient';
import { PageHeader } from '@/components/common/PageHeader';

interface UploadPageProps {
  searchParams: { welcome?: string };
}

export default function UploadPage({ searchParams }: UploadPageProps) {
  const isWelcome = searchParams.welcome === '1';
  return (
    <div className="p-8 max-w-3xl">
      {isWelcome && (
        <div className="mb-6 rounded-lg px-5 py-4 border" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-bd)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
            Welcome to Unauth! Your account is set up.
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--success)' }}>
            Upload your first order export below to run identity matching.
          </p>
        </div>
      )}
      <div className="mb-[var(--space-5)]">
        <PageHeader title="New Audit" subtitle="Upload a CSV export of your orders to detect suspicious refund patterns." />
      </div>
      <UploadClient />
    </div>
  );
}
