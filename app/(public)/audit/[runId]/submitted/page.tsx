import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

interface SubmittedPageProps {
  params: Promise<{ runId: string }>;
}

export const metadata = {
  title: 'Audit running — Unauth',
};

export default async function SubmittedPage({ params }: SubmittedPageProps) {
  const { runId } = await params;
  const sc = createServiceClient();
  const { data: audit } = await sc
    .from('public_audits' as any)
    .select('submitted_email')
    .eq('id', runId)
    .maybeSingle();

  if (!audit) notFound();
  const email = (audit as { submitted_email: string }).submitted_email;

  const sans: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
  const serif: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };
  const mono: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }}>
      {/* LOGO BAR */}
      <header style={{ padding: '20px 32px' }}>
        <Link href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
          <UnauthLogo variant="wordmark-light" size={28} />
        </Link>
      </header>

      <main
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '80px 24px 80px',
        }}
      >
        <h1
          style={{
            ...serif,
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#1A1814',
            marginTop: 0,
            marginBottom: '20px',
          }}
        >
          Your audit is running.
        </h1>

        <p
          style={{
            ...sans,
            fontSize: '16px',
            lineHeight: 1.65,
            color: '#3A3530',
            marginTop: 0,
            marginBottom: '20px',
          }}
        >
          We&apos;ll email your results to <strong style={{ fontWeight: 500 }}>{email}</strong> in
          around 20 minutes.
        </p>

        <p
          style={{
            ...mono,
            fontSize: '12px',
            color: '#6B6455',
            lineHeight: 1.7,
            marginTop: 0,
            marginBottom: '20px',
          }}
        >
          Analysing order patterns · refund clustering · repeat identity signals
        </p>

        <p
          style={{
            ...sans,
            fontSize: '14px',
            color: '#9A9080',
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          You can close this tab. Results come to your inbox.
        </p>
      </main>
    </div>
  );
}
