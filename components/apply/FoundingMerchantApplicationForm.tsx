'use client';

import { useReducer } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  foundingMerchantApplicationReducer,
  initialFoundingMerchantApplicationState,
} from '@/components/apply/foundingMerchantApplicationReducer';

const FIELD_STYLE = {
  fontFamily: 'var(--font-dm-sans, sans-serif)',
};

export default function FoundingMerchantApplicationForm({ defaultStoreName }: { defaultStoreName: string }) {
  const [state, dispatch] = useReducer(
    foundingMerchantApplicationReducer,
    defaultStoreName,
    initialFoundingMerchantApplicationState,
  );
  const {
    storeName,
    monthlyOrderVolume,
    refundVolume,
    fraudProblem,
    agreed,
    loading,
    error,
    submitted,
  } = state;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: 'patch', patch: { error: '' } });

    if (!storeName.trim() || !monthlyOrderVolume || !fraudProblem.trim() || !agreed) {
      dispatch({ type: 'patch', patch: { error: 'Please complete every required field.' } });
      return;
    }

    dispatch({ type: 'patch', patch: { loading: true } });

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

    dispatch({ type: 'patch', patch: { loading: false } });

    if (!response.ok) {
      dispatch({
        type: 'patch',
        patch: { error: typeof body?.error === 'string' ? body.error : 'We could not submit your application.' },
      });
      return;
    }

    dispatch({ type: 'patch', patch: { submitted: true } });
  }

  if (submitted) {
    return (
      <div className="rounded-sm border px-8 py-10" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <h1 className="text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
          Application received.
        </h1>
        <p className="mt-3 text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
          We&apos;ll be in touch within two business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border px-8 py-10" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
        Tier 2
      </p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
        Apply for network access.
      </h1>

      <div className="mt-8 space-y-5">
        <Field label="Store name">
          <Input value={storeName} onChange={(event) => dispatch({ type: 'patch', patch: { storeName: event.target.value } })} required style={FIELD_STYLE} />
        </Field>

        <Field label="Monthly order volume">
          <select
            value={monthlyOrderVolume}
            onChange={(event) => dispatch({ type: 'patch', patch: { monthlyOrderVolume: event.target.value } })}
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
            onChange={(event) => dispatch({ type: 'patch', patch: { refundVolume: event.target.value } })}
            placeholder="Optional"
            style={FIELD_STYLE}
          />
        </Field>

        <Field label="What fraud problem are you trying to solve?">
          <textarea
            value={fraudProblem}
            onChange={(event) => dispatch({ type: 'patch', patch: { fraudProblem: event.target.value } })}
            aria-label="What fraud problem are you trying to solve?"
            rows={3}
            required
            className="w-full rounded-[4px] border px-3 py-2 text-sm focus:outline-none"
            style={{ ...FIELD_STYLE, background: '#FAF6EF', borderColor: '#D2C9B5', color: '#1A1814' }}
          />
        </Field>

        <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => dispatch({ type: 'patch', patch: { agreed: event.target.checked } })}
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
