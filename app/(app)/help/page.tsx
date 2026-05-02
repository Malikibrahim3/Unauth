import Link from 'next/link';
import { BookOpen, FileText, HelpCircle } from 'lucide-react';

const ARTICLES = [
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
    href: '/help/csv-export',
    comingSoon: true,
  },
  {
    icon: HelpCircle,
    title: 'How identity matching works',
    description:
      'How Unauth links customers across orders using device IDs, IP addresses and card fingerprints.',
    href: '/help/csv-export',
    comingSoon: true,
  },
];

export default function HelpIndexPage() {
  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          Help &amp; Docs
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Guides to get the most out of Unauth.
        </p>
      </div>

      <div className="space-y-3">
        {ARTICLES.map(({ icon: Icon, title, description, href, comingSoon }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-lg px-5 py-4 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              opacity: comingSoon ? 0.65 : 1,
            }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md mt-0.5"
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
                className="text-xs font-semibold hover:underline flex-shrink-0 mt-0.5"
                style={{ color: 'var(--text)' }}
              >
                Read →
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
  );
}
