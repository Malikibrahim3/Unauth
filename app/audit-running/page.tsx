import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
    <div
      className="min-h-screen px-6 py-20 md:px-10"
      style={{ background: '#F8F5EE', color: '#1A1814' }}
    >
      <div className="mx-auto max-w-2xl rounded-sm border px-8 py-10 md:px-10 md:py-12" style={{ background: '#FDFBF6', borderColor: '#D8D0BD' }}>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#7B2D26',
            marginBottom: '14px',
          }}
        >
          Audit queued
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(30px, 4vw, 46px)',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            marginBottom: '16px',
          }}
        >
          Your audit is running.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '18px',
            lineHeight: 1.6,
            color: '#4A4640',
            marginBottom: '20px',
          }}
        >
          We&apos;ll email your results to <span style={{ color: '#1A1814' }}>{email}</span> in around 20 minutes. You can close this tab.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#8A8472',
            margin: 0,
          }}
        >
          We&apos;re analysing order patterns, refund clustering, and repeat identity signals across your data.
        </p>
      </div>
    </div>
  );
}
