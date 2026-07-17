import Link from 'next/link';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export default function AppNotFound() {
  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Workspace route"
        title="This page was not found"
        subtitle="The page may have been renamed or you may not have access. Return to your queue or verify the current workspace."
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-[11px] leading-5 text-[var(--text-secondary)]">No record or workflow state was changed.</p>
          <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-[var(--ua-radius-input)] px-3 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--accent)', color: 'white', outlineColor: 'var(--accent)' }}
              >
                Back to dashboard
              </Link>
              <Link
                href="/claims"
                className="inline-flex h-8 items-center rounded-[var(--ua-radius-input)] border px-3 text-[11px] font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
              >
                Open claims
              </Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
