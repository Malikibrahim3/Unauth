import Link from 'next/link';
import { BookOpen, FileText, HelpCircle, Info } from 'lucide-react';

const ARTICLES = [
  {
    icon: Info,
    title: 'How Unauth works',
    description:
      'How identity analysis works, how uploads build on each other, and how the chargeback evidence is generated.',
    href: '/help/how-it-works',
  },
  {
    icon: FileText,
    title: 'Exporting your orders CSV',
    description:
      'Step-by-step guide to exporting your orders CSV from any platform and getting the best results from Unauth.',
    href: '/help/csv-export',
  },
  {
    icon: BookOpen,
    title: 'Understanding confidence grades',
    description:
      'What definite, probable, possible, and weak confidence grades mean, and how to action each one.',
    href: '/help/confidence-grades',
  },
  {
    icon: HelpCircle,
    title: 'How identity matching works',
    description:
      'How Unauth links customers across orders using device IDs, IP addresses and card fingerprints.',
    href: '/help/identity-matching',
  },
];

export default function HelpIndexPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Dashboard
        </Link>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Help &amp; Docs</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Guides to get the most out of Unauth.
        </p>
      </div>

      <div className="space-y-3">
        {ARTICLES.map(({ icon: Icon, title, description, href }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-lg px-5 py-4 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
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
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            </div>
            <Link
              href={href}
              className="text-xs font-semibold hover:underline flex-shrink-0 mt-0.5"
              style={{ color: 'var(--text)' }}
            >
              Read →
            </Link>
          </div>
        ))}

        <div
          className="rounded-lg px-5 py-4 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Still stuck?
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Email us at{' '}
            <a
              href="mailto:support@unauth.io"
              className="underline underline-offset-2"
              style={{ color: 'var(--text)' }}
            >
              support@unauth.io
            </a>{' '}
            and we&apos;ll get back to you within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}
