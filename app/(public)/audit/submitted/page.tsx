import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { createServiceClient } from '@/lib/supabase/server';

interface SubmittedPageProps {
  searchParams: Promise<{ audit?: string }>;
}

export const metadata = {
  title: 'Audit running — Unauth',
};

export default async function SubmittedPage({ searchParams }: SubmittedPageProps) {
  const { audit: auditId } = await searchParams;
  if (!auditId) notFound();

  const sc = createServiceClient();
  const { data: audit } = await sc
    .from('public_audits' as any)
    .select('submitted_email')
    .eq('id', auditId)
    .maybeSingle();

  if (!audit) notFound();
  const email = (audit as { submitted_email: string }).submitted_email;

  const sans: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
  const serif: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };
  const mono: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }}>
      <header className="px-6 pt-5 md:px-10">
        <Link href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
          <UnauthLogo variant="wordmark-light" size={28} />
        </Link>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pb-24 pt-16 md:px-10 md:pt-24">
        <div className="max-w-[34rem]">
          <h1
            style={{
              ...serif,
              fontSize: 'clamp(38px, 6vw, 62px)',
              fontWeight: 400,
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Your audit is running.
          </h1>

          <p
            style={{
              ...sans,
              fontSize: '18px',
              lineHeight: 1.65,
              color: '#3A3530',
              marginTop: '18px',
              marginBottom: 0,
            }}
          >
            We&apos;ll email your results to <span style={{ fontWeight: 500 }}>{email}</span> in
            around 20 minutes.
          </p>

          <p
            style={{
              ...mono,
              fontSize: '12px',
              lineHeight: 1.7,
              letterSpacing: '0.06em',
              color: '#6B6455',
              marginTop: '18px',
              marginBottom: 0,
            }}
          >
            Analysing order patterns · refund clustering · repeat identity signals
          </p>

          <p
            style={{
              ...sans,
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#8A8472',
              marginTop: '16px',
              marginBottom: 0,
            }}
          >
            You can close this tab. Results come to your inbox.
          </p>
        </div>
      </main>
    </div>
  );
}
