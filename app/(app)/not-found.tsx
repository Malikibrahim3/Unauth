import Link from 'next/link';
import { EmptyState } from '@/components/ui';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <h1 className="sr-only">This workspace page was not found</h1>
      <EmptyState
          title="This workspace page was not found"
          description="The page may have been renamed or you may not have access. Return to your queue or open settings to verify integrations."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)', outlineColor: 'var(--accent)' }}
              >
                Back to dashboard
              </Link>
              <Link
                href="/inbox"
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
              >
                Open inbox
              </Link>
            </div>
          }
        />
    </div>
  );
}
