'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const FIELD_STYLE = {
  fontFamily: 'var(--font-dm-sans, sans-serif)',
};

export default function FoundingMerchantApplicationForm({ defaultStoreName }: { defaultStoreName: string }) {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [monthlyOrderVolume, setMonthlyOrderVolume] = useState('');
  const [refundVolume, setRefundVolume] = useState('');
  const [fraudProblem, setFraudProblem] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!storeName.trim() || !monthlyOrderVolume || !fraudProblem.trim() || !agreed) {
      setError('Please complete every required field.');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/founding-merchant-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: storeName.trim(),
        monthlyOrderVolume,
        monthlyRefundChargebackVolume: refundVolume.trim() || null,
        fraudProblem: fraudProblem.trim(),
        agreedToTerms: agreed,
      }),
    });

    const body = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      setError(typeof body?.error === 'string' ? body.error : 'We could not submit your application.');
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-sm border px-8 py-10" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <h1 className="text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
          Application received.
        </h1>
        <p className="mt-3 text-base leading-7" style={{ color: 'var(--text-muted)' }}>
          We&apos;ll be in touch within two business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border px-8 py-10" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
        Tier 2
      </p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
        Apply for network access.
      </h1>

      <div className="mt-8 space-y-5">
        <Field label="Store name">
          <Input value={storeName} onChange={(event) => setStoreName(event.target.value)} required style={FIELD_STYLE} />
        </Field>

        <Field label="Monthly order volume">
          <select
            value={monthlyOrderVolume}
            onChange={(event) => setMonthlyOrderVolume(event.target.value)}
            required
            className="w-full rounded-[4px] border px-3 py-2 text-sm focus:outline-none"
            style={{ ...FIELD_STYLE, background: '#FAF6EF', borderColor: '#D2C9B5', color: '#1A1814' }}
          >
            <option value="">Select range</option>
            <option value="<1k">&lt;1k</option>
            <option value="1k-5k">1k–5k</option>
            <option value="5k-20k">5k–20k</option>
            <option value="20k+">20k+</option>
          </select>
        </Field>

        <Field label="Monthly refund/chargeback volume">
          <Input
            value={refundVolume}
            onChange={(event) => setRefundVolume(event.target.value)}
            placeholder="Optional"
            style={FIELD_STYLE}
          />
        </Field>

        <Field label="What fraud problem are you trying to solve?">
          <textarea
            value={fraudProblem}
            onChange={(event) => setFraudProblem(event.target.value)}
            rows={3}
            required
            className="w-full rounded-[4px] border px-3 py-2 text-sm focus:outline-none"
            style={{ ...FIELD_STYLE, background: '#FAF6EF', borderColor: '#D2C9B5', color: '#1A1814' }}
          />
        </Field>

        <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1"
          />
          <span>
            Agree to pilot terms.{' '}
            <Link href="/legal/pilot-terms" className="underline" style={{ color: 'var(--text)' }}>
              Read terms
            </Link>
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-4 text-sm" style={{ color: '#7B2D26' }}>
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        <Button type="submit" size="lg" loading={loading}>
          Submit application →
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
