import Link from 'next/link';
import { BookOpen, HelpCircle, Info } from 'lucide-react';

const ARTICLES = [
  {
    icon: Info,
    title: 'Payout Control workflow',
    description:
      'Review support payout cases from the queue through evidence, merchant rules, recommendation, decision, and recovery.',
    href: '/claims',
  },
  {
    icon: BookOpen,
    title: 'Merchant payout rules',
    description:
      'Configure policy checks for requested action, payout exposure, evidence gaps, prior case history, and recoverability.',
    href: '/rules',
  },
  {
    icon: HelpCircle,
    title: 'Recovery follow-up',
    description:
      'Track recoverable losses, recovery owners, deadlines, required evidence, and partner outcomes.',
    href: '/recoveries',
  },
  {
    icon: BookOpen,
    title: 'Yuma escalation setup',
    description:
      'Configure Yuma to hand post-purchase claim escalations to the Unauth Gate API.',
    href: '/help/integrations/yuma',
  },
  {
    icon: BookOpen,
    title: 'Siena escalation setup',
    description:
      'Configure Siena escalation webhooks with the Unauth Gate API endpoint and bearer key.',
    href: '/help/integrations/siena',
  },
];

export default function HelpIndexPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-caption mb-4 hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dashboard
        </Link>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Help &amp; Docs</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Payout-control guides and shortcuts for support operations.
        </p>
      </div>

      <div className="space-y-3">
        {ARTICLES.map(({ icon: Icon, title, description, href }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-md px-5 py-4 border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border-muted)',
            }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md mt-0.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {title}
              </p>
              <p className="text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            </div>
            <Link
              href={href}
              className="text-caption font-semibold hover:underline flex-shrink-0 mt-0.5"
              style={{ color: 'var(--text)' }}
            >
              Read
            </Link>
          </div>
        ))}

        <div
          className="rounded-md px-5 py-4 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Still stuck?
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Email us at{' '}
            <a
              href="mailto:support@unauth.app"
              className="underline underline-offset-2"
              style={{ color: 'var(--text)' }}
            >
              support@unauth.app
            </a>{' '}
            and we&apos;ll get back to you within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}
