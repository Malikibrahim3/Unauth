import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '../../styles/authenticated/index.css';

export const metadata: Metadata = {
  title: 'Context backfill running | Unauth',
  description: 'Your claim context backfill is in progress.',
};

interface AuditRunningPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function AuditRunningPage({ searchParams }: AuditRunningPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/audit-running');

  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams.email ?? user.email ?? 'your inbox';

  return (
    <div className="ua-auth-surface min-h-screen bg-[var(--surface-base)] px-6 py-20 text-[var(--text-primary)] md:px-10">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-8 py-10 md:px-10 md:py-12">
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '14px',
          }}
        >
          Context backfill queued
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 620,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            marginBottom: '16px',
          }}
        >
          Your claim context backfill is running.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '16px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}
        >
          We&apos;ll email your results to <span style={{ color: 'var(--text-primary)' }}>{email}</span> when processing finishes. You can also check status in the app.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--text-tertiary)',
            margin: 0,
          }}
        >
          We&apos;re linking available order, helpdesk, claim, and outcome context from your connected systems.
        </p>
      </div>
    </div>
  );
}
