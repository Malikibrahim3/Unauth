import Link from 'next/link';
import { Settings, User, Bell, Shield, CreditCard, Users } from 'lucide-react';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';

const SECTIONS = [
  {
    icon: User,
    title: 'Account',
    description: 'Manage your store name, email, password, and danger zone.',
    href: '/settings/account',
    comingSoon: false,
  },
  {
    icon: Users,
    title: 'Team & Access',
    description: 'Invite team members, assign roles (admin, analyst, viewer), and manage access.',
    href: '/settings/team',
    comingSoon: false,
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Control which alerts you receive and how.',
    href: '#notifications',
    comingSoon: true,
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Two-factor authentication and active sessions.',
    href: '#security',
    comingSoon: true,
  },
  {
    icon: CreditCard,
    title: 'Billing',
    description: 'View your plan and manage payment details.',
    href: '#billing',
    comingSoon: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          Settings
        </h1>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ icon: Icon, title, description, href, comingSoon }) => (
          <div
            key={title}
            className="flex items-center gap-4 rounded-lg px-5 py-4 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              opacity: comingSoon ? 0.65 : 1,
            }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {title}
                </p>
                {comingSoon && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            </div>
            {!comingSoon && (
              <Link
                href={href}
                className="text-xs font-semibold hover:underline flex-shrink-0"
                style={{ color: 'var(--text)' }}
              >
                Manage →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div
        className="rounded-lg px-5 py-4 border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Need help?
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Check the{' '}
          <Link
            href="/help/csv-export"
            className="underline underline-offset-2"
            style={{ color: 'var(--text)' }}
          >
            help docs
          </Link>{' '}
          or contact support at{' '}
          <a
            href="mailto:support@unauth.io"
            className="underline underline-offset-2"
            style={{ color: 'var(--text)' }}
          >
            support@unauth.io
          </a>
          .
        </p>
      </div>

      <div
        className="rounded-lg px-5 py-4 border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Danger zone
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Permanently delete selected app data. This does not remove our internal records.
        </p>
        <div className="mt-3">
          <BulkDeleteClient />
        </div>
      </div>
    </div>
  );
}
