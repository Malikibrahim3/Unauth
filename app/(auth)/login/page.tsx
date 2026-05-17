'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

// ── Static decorative case file preview ──────────────────────────────────────

function CaseFilePreview() {
  const rows = [
    { name: 'HeyGlow Skincare',     meta: '3 ord · 2 ref',  amt: '$340',    w: 24 },
    { name: 'Murmur Audio',         meta: '3 ord · 2 INR',  amt: '$1,210',  w: 88 },
    { name: 'RidgePath Outfitters', meta: '2 ord · 2 INR',  amt: '$613',    w: 44 },
    { name: 'Aster & Vale',         meta: '1 ord · 1 ref',  amt: '$284',    w: 20 },
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #D2C9B5',
        borderRadius: '6px',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 4px 24px rgba(26,24,20,0.08), 0 1px 4px rgba(26,24,20,0.05)',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          borderBottom: '1px solid #E5DECE',
          background: '#FAF6EF',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '9999px',
              background: '#7B2D26',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#4A4640',
            }}
          >
            CASE FILE · UN-2026-04-21-0083 · SYNTHETIC EXAMPLE
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { label: 'DEFINITE', bg: '#1A1814', fg: '#E8E4D8' },
            { label: 'RISK 0.92', bg: '#FBEFEC', fg: '#7B2D26' },
            { label: 'CONF 0.96', bg: '#F2EDE3', fg: '#4A4640' },
          ].map(({ label, bg, fg }) => (
            <span
              key={label}
              style={{
                padding: '2px 7px',
                background: bg,
                color: fg,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                borderRadius: '3px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 14px 0' }}>
        {/* Subject */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#78889C',
              marginBottom: '4px',
            }}
          >
            SUBJECT
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1A1814' }}>
              Noah K████████
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#4A4640',
                fontFamily: 'var(--font-dm-mono, monospace)',
              }}
            >
              → #u_kessler.07
            </span>
          </div>
        </div>

        {/* 4-column stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #E5DECE',
          }}
        >
          {[
            { label: 'EMAILS',    value: '3 variants', mono: false },
            { label: 'ADDRESSES', value: '3 variants', mono: false },
            { label: 'PAYMENT',   value: 'Chase ••4419', mono: true },
            { label: 'DEVICES',   value: '2 prints', mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#78889C',
                  marginBottom: '3px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#1A1814',
                  fontFamily: mono ? 'var(--font-dm-mono, monospace)' : 'inherit',
                  fontWeight: 500,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Network footprint */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#78889C',
              }}
            >
              NETWORK FOOTPRINT
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#4A4640',
                fontFamily: 'var(--font-dm-mono, monospace)',
              }}
            >
              7 merchants · $3,337 lifetime
            </span>
          </div>

          {rows.map((row) => (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '5px',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '11px',
                  color: '#2E3947',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {row.name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: '#78889C',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {row.meta}
              </span>
              <div
                style={{
                  width: '48px',
                  height: '2px',
                  background: '#EAE3D4',
                  borderRadius: '9999px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: `${row.w}%`,
                    height: '100%',
                    background: '#7B2D26',
                    borderRadius: '9999px',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#1A1814',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  width: '44px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {row.amt}
              </span>
            </div>
          ))}
        </div>

        {/* Recommended action */}
        <div
          style={{
            borderTop: '1px solid #E5DECE',
            padding: '10px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '9999px',
              background: '#7B2D26',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#7B2D26',
              flex: 1,
              lineHeight: 1.4,
            }}
          >
            DECLINE NEXT ORDER · ASSEMBLE CE 3.0 PACKET FOR 2 OPEN DISPUTES
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#78889C',
              background: '#F2EDE3',
              padding: '2px 6px',
              borderRadius: '3px',
              fontFamily: 'var(--font-dm-mono, monospace)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            packet.pdf · 2.4mb
          </span>
        </div>
      </div>

      {/* ── Metadata footer ── */}
      <div
        style={{
          padding: '7px 14px',
          borderTop: '1px solid #E5DECE',
          background: '#FAF6EF',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: '#78889C',
            fontFamily: 'var(--font-dm-mono, monospace)',
            letterSpacing: '0.02em',
          }}
        >
          generated 2026-05-15 09:42 EST · pipeline latency 38ms · HMAC-SHA256 · per-tenant salt
        </span>
      </div>
    </div>
  );
}

// ── Form field input style ────────────────────────────────────────────────────

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  padding: '8px 11px',
  borderRadius: '4px',
  fontSize: '13px',
  lineHeight: '20px',
  background: '#FAF6EF',
  border: '1px solid #D2C9B5',
  color: '#1A1814',
  outline: 'none',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
  transition: 'border-color 120ms, background 120ms',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#78889C',
  marginBottom: '6px',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
};

function onFocusInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#4A4640';
  e.target.style.background = '#FFFFFF';
}

function onBlurInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#D2C9B5';
  e.target.style.background = '#FAF6EF';
}

// ── Page component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');

  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) {
        setError('Please fill in all store details.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        localStorage.setItem('pendingMerchant', JSON.stringify({ storeName, platform, annualVolume, primaryConcern }));
        setError('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setLoading(false);
        return;
      }

      const { error: merchantError } = await supabase.from('merchants').insert({
        user_id: signInData.user!.id,
        name: storeName.trim(),
        monthly_order_volume: annualVolume,
        primary_fraud_concern: primaryConcern,
        setup_complete: true,
      });

      setLoading(false);
      if (merchantError) { setError(merchantError.message); return; }
      router.push('/dashboard');
      router.refresh();
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const pending = localStorage.getItem('pendingMerchant');
      if (pending) {
        const { storeName, annualVolume, primaryConcern } = JSON.parse(pending);
        await supabase.from('merchants').insert({
          user_id: signInData.user!.id,
          name: storeName.trim(),
          monthly_order_volume: annualVolume,
          primary_fraud_concern: primaryConcern,
          setup_complete: true,
        });
        localStorage.removeItem('pendingMerchant');
      }

      setLoading(false);
      router.push('/dashboard');
      router.refresh();
    }
  }

  const isSubmitDisabled =
    loading ||
    !email ||
    !password ||
    (isSignUp && (!storeName.trim() || !platform || !annualVolume || !primaryConcern));

  const isSuccess = error.includes('created') || error.includes('Check your email');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8F5EE',
        display: 'flex',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}
    >
      {/* ══ Left brand panel ════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '50%',
          minHeight: '100vh',
          padding: '44px 48px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #D2C9B5',
        }}
      >
        <UnauthLogo variant="wordmark-light" size={96} />
      </div>

      {/* ══ Right form panel ═════════════════════════════════════════════════ */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          overflowY: 'auto',
        }}
        className="lg:w-1/2"
      >
        {/* Logo — mobile only */}
        <div className="lg:hidden" style={{ marginBottom: '32px' }}>
          <UnauthLogo variant="wordmark-light" size={26} />
        </div>

        <div style={{ width: '100%', maxWidth: '340px' }}>
          {/* Form header */}
          <div style={{ marginBottom: '24px' }}>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#78889C',
                marginBottom: '8px',
              }}
            >
              {isSignUp ? 'REQUEST ACCESS' : 'PILOT ACCESS'}
            </p>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: '#1A1814',
                lineHeight: 1.2,
              }}
            >
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {/* Email */}
            <div>
              <label style={LABEL_STYLE}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={INPUT_BASE}
                onFocus={onFocusInput}
                onBlur={onBlurInput}
              />
            </div>

            {/* Password */}
            <div>
              <label style={LABEL_STYLE}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={INPUT_BASE}
                onFocus={onFocusInput}
                onBlur={onBlurInput}
              />
            </div>

            {/* Sign-up extra fields */}
            {isSignUp && (
              <>
                {/* Section divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '3px 0',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', background: '#E5DECE' }} />
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#78889C',
                    }}
                  >
                    STORE DETAILS
                  </span>
                  <div style={{ flex: 1, height: '1px', background: '#E5DECE' }} />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Store name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    placeholder="Acme Commerce Ltd"
                    style={INPUT_BASE}
                    onFocus={onFocusInput}
                    onBlur={onBlurInput}
                  />
                </div>

                <div>
                  <label style={LABEL_STYLE}>Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    required
                    style={INPUT_BASE}
                    onFocus={onFocusInput}
                    onBlur={onBlurInput}
                  >
                    <option value="">Select platform…</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="magento">Magento</option>
                    <option value="bigcommerce">BigCommerce</option>
                    <option value="custom">Custom</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={LABEL_STYLE}>Annual order volume</label>
                  <select
                    value={annualVolume}
                    onChange={(e) => setAnnualVolume(e.target.value)}
                    required
                    style={INPUT_BASE}
                    onFocus={onFocusInput}
                    onBlur={onBlurInput}
                  >
                    <option value="">Select range…</option>
                    <option value="under_10k">Under 10,000</option>
                    <option value="10k_50k">10,000–50,000</option>
                    <option value="50k_250k">50,000–250,000</option>
                    <option value="over_250k">Over 250,000</option>
                  </select>
                </div>

                <div>
                  <label style={LABEL_STYLE}>Primary concern</label>
                  <select
                    value={primaryConcern}
                    onChange={(e) => setPrimaryConcern(e.target.value)}
                    required
                    style={INPUT_BASE}
                    onFocus={onFocusInput}
                    onBlur={onBlurInput}
                  >
                    <option value="">Select your main concern…</option>
                    <option value="refund_abuse">Refund abuse</option>
                    <option value="inr_claims">INR claims</option>
                    <option value="chargebacks">Chargebacks</option>
                    <option value="all">All of the above</option>
                  </select>
                </div>
              </>
            )}

            {/* Error / success message */}
            {error && (
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: isSuccess ? '#2F6B43' : '#7B2D26',
                  padding: '8px 10px',
                  background: isSuccess ? '#E8F1E6' : '#FBEFEC',
                  borderRadius: '4px',
                  border: `1px solid ${isSuccess ? '#B5D2A8' : '#D08B7E'}`,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '4px',
                background: isSubmitDisabled ? '#C8C0B0' : '#1A1814',
                color: '#E8E4D8',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                border: 'none',
                transition: 'background 120ms',
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitDisabled) e.currentTarget.style.background = '#7B2D26';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitDisabled) e.currentTarget.style.background = '#1A1814';
              }}
            >
              {loading ? 'Processing…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* Toggle sign-in / sign-up */}
          <p
            style={{
              marginTop: '20px',
              fontSize: '13px',
              color: '#78889C',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              style={{
                color: '#1A1814',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontSize: '13px',
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                padding: 0,
              }}
            >
              {isSignUp ? 'Sign in' : 'Request access'}
            </button>
          </p>

          {/* Footnote */}
          <p
            style={{
              marginTop: '28px',
              fontSize: '11px',
              color: '#B9C2CF',
              textAlign: 'center',
              letterSpacing: '0.02em',
              lineHeight: 1.5,
            }}
          >
            Pilot access · No checkout integration required
          </p>
        </div>
      </div>
    </div>
  );
}
