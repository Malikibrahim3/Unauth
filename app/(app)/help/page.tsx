import Link from 'next/link';
import { BookOpen, HelpCircle, Info } from 'lucide-react';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
];

export default function HelpIndexPage() {
  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Support"
        title="Help & Docs"
        subtitle="Payout-control guides and shortcuts for support operations."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Help & Docs' }]}
      />
      <div className={pageStyles.pageBody}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <AuthenticatedPanel title="Guides" description="Operational playbooks for common workflows.">
            <div className="divide-y divide-[var(--border-muted)]">
              {ARTICLES.map(({ icon: Icon, title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group flex min-h-[72px] items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)]"
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[var(--text-primary)]">{title}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[var(--text-secondary)]">{description}</span>
                  </span>
                  <span className="flex-none text-[10px] font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]">Read</span>
                </Link>
              ))}
            </div>
          </AuthenticatedPanel>
          <AuthenticatedPanel title="Still stuck?" description="Talk to the Unauth support team.">
            <div className="p-4">
              <p className="text-[11px] leading-5 text-[var(--text-secondary)]">
                Email us and we&apos;ll get back to you within one business day.
              </p>
              <a
                href="mailto:support@unauth.app"
                className="mt-3 inline-flex h-7 items-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-hover)]"
              >
                support@unauth.app
              </a>
            </div>
          </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
