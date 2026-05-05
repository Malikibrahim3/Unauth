import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';

export default function TeamSettingsPage() {
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/settings" className="hover:opacity-80 transition-colors">Settings</Link>
          <span>/</span>
          <span>Team</span>
        </div>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Team management</h1>
      </div>

      <div
        className="rounded-xl p-8 border flex flex-col items-center text-center gap-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <Users className="h-7 w-7" style={{ color: 'var(--icon-muted)' }} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-heading-sm" style={{ color: 'var(--text)' }}>Team access coming soon</h2>
          <p className="text-body-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Invite colleagues, assign roles, and control which team members can review investigations,
            generate evidence, or manage account settings.
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          Need multi-user access now?{' '}
          <a href="mailto:hello@unauth.co" className="underline hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
            Contact us
          </a>{' '}
          and we&apos;ll set it up for your account.
        </p>
      </div>

      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
    </div>
  );
}
