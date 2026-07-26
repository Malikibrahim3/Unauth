import Link from 'next/link';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export default function AppNotFound() {
  return (
    <div>
      <AuthenticatedPageHeader
        title="This page was not found"
        subtitle="The page may have been renamed or you may not have access. Return to your queue or verify the current workspace."
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-[length:var(--ua-text-micro-size)] leading-5 text-[var(--ua-text-secondary)]">No record or workflow state was changed.</p>
          <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-micro-size)] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)', outlineColor: 'var(--ua-action-primary)' }}
              >
                Back to dashboard
              </Link>
              <Link
                href="/claims"
                className="inline-flex h-8 items-center rounded-[var(--ua-radius-control)] border px-3 text-[length:var(--ua-text-micro-size)] font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ borderColor: 'var(--ua-border-subtle)', color: 'var(--ua-text-primary)', outlineColor: 'var(--ua-action-primary)' }}
              >
                Open claims
              </Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
