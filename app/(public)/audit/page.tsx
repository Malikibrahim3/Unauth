import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import AuditUploadForm from './AuditUploadForm';

export const metadata = {
  title: 'Free Fraud Audit — Unauth',
  description:
    'Upload your last 90 days of orders and refunds. We run a free fraud-resolution audit and email you the results.',
};

const sans: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
const serif: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };
const mono: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
const muted = '#6B6455';

export default function AuditPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }}>
      {/* LOGO BAR */}
      <header style={{ padding: '20px 32px' }}>
        <Link href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
          <UnauthLogo variant="wordmark-light" size={28} />
        </Link>
      </header>

      {/* PAGE CONTENT */}
      <main
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '48px 24px 80px',
        }}
      >
        {/* HEADLINE BLOCK */}
        <div style={{ marginBottom: '36px' }}>
          <p
            style={{
              ...mono,
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: muted,
              marginTop: 0,
              marginBottom: '14px',
            }}
          >
            FREE AUDIT · NO ACCOUNT REQUIRED
          </p>
          <h1
            style={{
              ...serif,
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#1A1814',
              marginTop: 0,
              marginBottom: '16px',
            }}
          >
            Find out who&apos;s been hitting you.
          </h1>
          <p
            style={{
              ...sans,
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#3A3530',
              marginTop: 0,
              marginBottom: 0,
            }}
          >
            Upload your last 90 days of orders and refunds. We&apos;ll run a fraud-resolution audit
            on your store data and email you the results — linked identities, repeat abuser
            clusters, and risk scores.
          </p>
        </div>

        {/* TRUST STACK */}
        <div
          style={{
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[
            'Your customer emails, names, and addresses are hashed in your browser before anything leaves your device. We receive hashes, not data.',
            'Your CSV is processed once. If you don\'t create an account within 7 days of receiving your results, everything is automatically deleted.',
          ].map((line) => (
            <p
              key={line}
              style={{
                ...sans,
                fontSize: '13px',
                color: muted,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {line}
            </p>
          ))}
          <p
            style={{
              ...sans,
              fontSize: '13px',
              color: muted,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Questions before uploading? Email Malik directly —{' '}
            <a
              href="mailto:malik@unauth.co"
              style={{ color: muted, textDecoration: 'underline' }}
            >
              malik@unauth.co
            </a>{' '}
            — response within 2 hours.
          </p>
        </div>

        {/* UPLOAD FORM */}
        <AuditUploadForm />

        {/* BOTTOM TRUST LINE */}
        <p
          style={{
            ...mono,
            fontSize: '11px',
            color: '#9A9080',
            textAlign: 'center',
            marginTop: '56px',
            marginBottom: 0,
            letterSpacing: '0.04em',
          }}
        >
          HMAC-SHA256 · client-side hashing · k-anonymity gated · UK GDPR compliant
        </p>
      </main>
    </div>
  );
}
