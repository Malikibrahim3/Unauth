import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

interface SubmittedPageProps {
  params: Promise<{ runId: string }>;
}

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

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }} className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-3xl border px-8 py-10 md:px-10 md:py-12" style={{ background: '#FDFBF6', borderColor: '#D8D0BD' }}>
        <h1
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(32px, 4vw, 50px)',
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            marginBottom: '16px',
          }}
        >
          Your audit is running.
        </h1>
        <p style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '18px', color: '#4A4640', lineHeight: 1.6, marginBottom: '18px' }}>
          We&apos;ll email your results to {email} in around 20 minutes. You can close this tab.
        </p>
        <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px', color: '#8A8472', margin: 0 }}>
          We&apos;re analysing order patterns, refund clustering, and repeat identity signals across your data.
        </p>
      </div>
    </div>
  );
}
