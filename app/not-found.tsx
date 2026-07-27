import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

/*
 * The 404 renders product chrome, so it carries the product token scope. It
 * previously read `--accent` / `--text` / `--bg-canvas`, which resolve at `:root`
 * to the public palette — so the primary button rendered in the old
 * rust. `ua-app` scopes the `--ua-*` tokens here the same way the app shell does.
 */
export default function NotFound() {
  return (
    <div
      className="ua-app flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: 'var(--ua-canvas)' }}
    >
      <Link href="/" aria-label="Unauth home" className="mb-8 inline-flex">
        <UnauthLogo kind="lockup" tone="auto" height={24} alt="" decorative />
      </Link>
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        title="Page not found"
        description="This route does not exist or may have moved."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-[var(--ua-control-height-md)] items-center rounded-[var(--ua-radius-control)] px-4 text-[length:var(--ua-text-small-size)] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                background: 'var(--ua-action-primary)',
                color: 'var(--ua-action-primary-fg)',
                border: '1px solid var(--ua-action-primary)',
                outlineColor: 'var(--ua-border-focus)',
              }}
            >
              Go to Overview
            </Link>
            <Link
              href="/"
              className="inline-flex h-[var(--ua-control-height-md)] items-center rounded-[var(--ua-radius-control)] border px-4 text-[length:var(--ua-text-small-size)] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                borderColor: 'var(--ua-border-default)',
                background: 'var(--ua-surface-primary)',
                color: 'var(--ua-text-primary)',
                outlineColor: 'var(--ua-border-focus)',
              }}
            >
              Back to home
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[var(--ua-control-height-md)] items-center rounded-[var(--ua-radius-control)] border px-4 text-[length:var(--ua-text-small-size)] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                borderColor: 'var(--ua-border-default)',
                background: 'var(--ua-surface-primary)',
                color: 'var(--ua-text-primary)',
                outlineColor: 'var(--ua-border-focus)',
              }}
            >
              Sign in
            </Link>
          </div>
        }
      />
    </div>
  );
}
