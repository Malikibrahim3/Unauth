import Link from 'next/link';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
          title="Page not found"
          description="This route does not exist or may have moved."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
              >
                Back to home
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)', outlineColor: 'var(--accent)' }}
              >
                Go to dashboard
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
              >
                Sign in
              </Link>
            </div>
          }
        />
    </div>
  );
}
