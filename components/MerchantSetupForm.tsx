'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MerchantSetupForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Upsert merchant row (user may already exist from a previous partial setup)
    const { error: upsertError } = await supabase
      .from('merchants')
      .upsert(
        {
          user_id: userId,
          name: name.trim(),
          monthly_order_volume: monthlyVolume,
          primary_fraud_concern: primaryConcern,
          setup_complete: true,
        },
        { onConflict: 'user_id' }
      );

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.push('/upload?welcome=1');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
          Store name <span style={{ color: 'var(--risk-critical)' }}>*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Acme Commerce Ltd"
          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
        />
      </div>

      <div>
        <label htmlFor="monthlyVolume" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
          Approximate monthly order volume <span style={{ color: 'var(--risk-critical)' }}>*</span>
        </label>
        <select
          id="monthlyVolume"
          value={monthlyVolume}
          onChange={(e) => setMonthlyVolume(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">Select a range…</option>
          <option value="under_500">Under 500</option>
          <option value="500_2000">500 – 2,000</option>
          <option value="2000_10000">2,000 – 10,000</option>
          <option value="10000_plus">10,000+</option>
        </select>
      </div>

      <div>
        <label htmlFor="primaryConcern" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
          Primary concern <span style={{ color: 'var(--risk-critical)' }}>*</span>
        </label>
        <select
          id="primaryConcern"
          value={primaryConcern}
          onChange={(e) => setPrimaryConcern(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">Select your main concern…</option>
          <option value="refund_abuse">Refund abuse</option>
          <option value="item_not_received">Item not received (INR) claims</option>
          <option value="chargebacks">Chargebacks</option>
          <option value="all">All of the above</option>
        </select>
      </div>

      {error && <p className="text-sm" style={{ color: 'var(--risk-critical)' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading || !name.trim() || !monthlyVolume || !primaryConcern}
        className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
      >
        {loading ? 'Setting up…' : 'Complete setup →'}
      </button>
    </form>
  );
}

