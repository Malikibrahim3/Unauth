'use client';

import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Users, Clock, Zap, Info } from 'lucide-react';
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';

const DAILY_LIMIT = 200;

interface LookupResult {
  id: string;
  risk_score: number;
  risk_level: string;
  fraud_flags: string[];
  total_orders: number;
  total_refund_claims: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  fastest_claim_days: number | null;
  first_seen: string;
  last_seen: string;
  primary_email: string | null;
  names: string[];
  addresses: string[];
  merchant_contributed: boolean;
}

interface QuickScoreResult {
  score: number;
  riskTier: string;
  flagged: boolean;
  signals: Array<{ name: string; score: number; reason: string }>;
  matchingEntities: Array<{ type: string; value: string; record: object }>;
  hasHistory: boolean;
  caveat: string | null;
}

export default function LookupPage() {
  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [address, setAddress] = useState('');
  const [card, setCard]       = useState('');
  const [ip, setIp]           = useState('');

  const [results, setResults]   = useState<LookupResult[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Lookups remaining counter
  const [lookupsUsed, setLookupsUsed] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/lookup/remaining')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.used != null) setLookupsUsed(d.used); })
      .catch(() => {});
  }, []);

  // Quick-score state
  const [qEmail, setQEmail]     = useState('');
  const [qName, setQName]       = useState('');
  const [qAddress, setQAddress] = useState('');
  const [qCard, setQCard]       = useState('');
  const [qIp, setQIp]           = useState('');
  const [qResult, setQResult]   = useState<QuickScoreResult | null>(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError]     = useState('');

  const hasInput = email || name || address || card || ip;
  const hasQInput = qEmail;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInput) return;

    setLoading(true);
    setError('');
    setSearched(false);
    setResults(null);

    const params = new URLSearchParams();
    if (email)   params.set('email', email);
    if (name)    params.set('name', name);
    if (address) params.set('address', address);
    if (card)    params.set('card', card);
    if (ip)      params.set('ip', ip);

    try {
      const res = await fetch(`/api/lookup?${params}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Search failed');
        return;
      }
      const data = await res.json();
      setResults(data.results);
      setLookupsUsed((prev) => prev != null ? prev + 1 : null);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function handleQuickScore(e: React.FormEvent) {
    e.preventDefault();
    if (!hasQInput) return;

    setQLoading(true);
    setQError('');
    setQResult(null);

    try {
      const res = await fetch('/api/lookup/quick-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: qEmail,
          name: qName,
          address: qAddress,
          card_last4: qCard,
          ip: qIp,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setQError(body.error ?? 'Quick check failed');
        return;
      }
      setQResult(await res.json());
    } catch {
      setQError('Quick check failed. Please try again.');
    } finally {
      setQLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Customer Lookup</h1>
        <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            Check a customer before accepting a refund. Searches your full audit history instantly.
          </p>
          {lookupsUsed != null && (
            <p
              className="text-caption flex-shrink-0"
              style={{ color: (DAILY_LIMIT - lookupsUsed) < 20 ? 'var(--risk-high)' : 'var(--text-subtle)' }}
            >
              Lookups remaining today: {Math.max(0, DAILY_LIMIT - lookupsUsed)} / {DAILY_LIMIT}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSearch} className="rounded-lg p-5 space-y-4 mb-6 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Email address', type: 'email', value: email, setter: setEmail, placeholder: 'customer@example.com' },
            { label: 'Full name', type: 'text', value: name, setter: setName, placeholder: 'John Smith' },
            { label: 'Card last 4 digits', type: 'text', value: card, setter: (v: string) => setCard(v.replace(/\D/g, '').slice(0, 4)), placeholder: '4242' },
            { label: 'IP address', type: 'text', value: ip, setter: setIp, placeholder: '192.168.1.1' },
          ].map(({ label, type, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Shipping address or postcode</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, London, SW1A 1AA"
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hasInput || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 text-sm rounded-md mb-4 border" style={{ color: 'var(--risk-critical)', background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)' }}>
          {error}
        </div>
      )}

      {searched && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="rounded-lg p-5 border" style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}>
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--risk-high)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No history found for this customer.</p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    This doesn&apos;t mean they&apos;re low risk &mdash; it may be their first time, or they may
                    not have appeared in any of your audits yet. A blank result is not a green light.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                {results.length} profile{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} onOpen={() => setSelectedProfileId(profile.id)} />
              ))}
            </div>
          )}
          {/* "Not a green light" — present on every result state */}
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              This lookup is not a green light. Customers without history may still be acting in bad faith. Use this alongside your own judgement.
            </p>
          </div>
        </>
      )}
      {/* ------------------------------------------------------------------ */}
      {/* Quick score section                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>Don&apos;t see them? Run a quick check.</h2>
        </div>
        <p className="text-caption mb-4" style={{ color: 'var(--text-muted)' }}>
          Score a customer who hasn&apos;t appeared in a full audit yet. Read-only &mdash; nothing is saved.
        </p>
        <form onSubmit={handleQuickScore} className="rounded-lg p-5 space-y-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Email address *', type: 'email', value: qEmail, setter: setQEmail, placeholder: 'customer@example.com', required: true },
              { label: 'Full name', type: 'text', value: qName, setter: setQName, placeholder: 'John Smith', required: false },
              { label: 'Card last 4', type: 'text', value: qCard, setter: (v: string) => setQCard(v.replace(/\D/g, '').slice(0, 4)), placeholder: '4242', required: false },
              { label: 'IP address', type: 'text', value: qIp, setter: setQIp, placeholder: '192.168.1.1', required: false },
            ].map(({ label, type, value, setter, placeholder, required }) => (
              <div key={label}>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input
                  type={type}
                  required={required}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Shipping address</label>
            <input
              type="text"
              value={qAddress}
              onChange={(e) => setQAddress(e.target.value)}
              placeholder="123 Main St, London, SW1A 1AA"
              className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.outline = 'none'; }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!hasQInput || qLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              <Zap className="h-4 w-4" />
              {qLoading ? 'Checking…' : 'Quick check'}
            </button>
          </div>
        </form>

        {qError && (
          <div className="mt-3 p-3 text-sm rounded-md border" style={{ color: 'var(--risk-critical)', background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)' }}>{qError}</div>
        )}

        {qResult && (
          <div className="mt-4 rounded-lg p-5 space-y-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{qEmail}</span>
                  <ConfidenceGrade grade={riskLevelToGrade(qResult.riskTier)} />
                </div>
                <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>Quick check result — not saved to profiles</p>
              </div>
              <div className="text-right">
                <div className="text-display-sm font-mono font-bold" style={{ color: 'var(--text)' }}>{Math.round(qResult.score)}</div>
                <div className="text-caption" style={{ color: 'var(--text-subtle)' }}>match confidence</div>
              </div>
            </div>

            {qResult.signals.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Signals that fired:</p>
                {qResult.signals.map((s) => (
                  <div key={s.name} className="text-xs rounded px-3 py-2 border" style={{ background: 'var(--risk-critical-bg)', borderColor: 'var(--risk-critical-bd)', color: 'var(--text)' }}>
                    <span className="font-semibold" style={{ color: 'var(--risk-critical)' }}>{s.name}</span> — {s.reason}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No identity signals fired.</p>
            )}

            {qResult.caveat && (
              <div className="flex gap-2 p-3 rounded-md border" style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--risk-high)' }} />
                <p className="text-xs" style={{ color: 'var(--text)' }}>{qResult.caveat}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CustomerIntelligenceDrawer
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}

function ProfileCard({ profile, onOpen }: { profile: LookupResult; onOpen: () => void }) {
  const displayName  = profile.names[0] ?? null;
  const displayEmail = profile.primary_email;
  const refundPct    = Math.round(profile.refund_rate * 100);

  return (
    <div className="rounded-lg p-5 space-y-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-body-md font-semibold truncate" style={{ color: 'var(--text)' }}>
              {displayName ?? (profile.merchant_contributed ? '—' : 'Customer')}
            </span>
            <ConfidenceGrade grade={riskLevelToGrade(profile.risk_level)} />
          </div>
          {displayEmail && (
            <div className="text-body-sm mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{displayEmail}</div>
          )}
          {!profile.merchant_contributed && (
            <div className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>
              Found via cross-merchant signals — identity details not shown
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-display-sm font-mono font-bold" style={{ color: 'var(--text)' }}>{Math.round(profile.risk_score)}</div>
          <div className="text-caption" style={{ color: 'var(--text-subtle)' }}>match confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Orders',        value: profile.total_orders },
          { label: 'Refund claims', value: profile.total_refund_claims },
          { label: 'Refund rate',   value: `${refundPct}%` },
          { label: 'Merchants',     value: profile.total_merchants_seen_at },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-body-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {profile.fraud_flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.fraud_flags.slice(0, 6).map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center px-2 py-0.5 rounded-sm border text-xs"
              style={{ background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', borderColor: 'var(--risk-critical-bd)' }}
            >
              {flag}
            </span>
          ))}
          {profile.fraud_flags.length > 6 && (
            <span className="text-xs self-center" style={{ color: 'var(--text-subtle)' }}>+{profile.fraud_flags.length - 6} more</span>
          )}
        </div>
      )}

      {profile.fastest_claim_days !== null && (
        <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Fastest refund claim: <span className="font-semibold">{profile.fastest_claim_days} day{profile.fastest_claim_days !== 1 ? 's' : ''}</span> after delivery
        </div>
      )}

      {profile.total_merchants_seen_at > 1 && (
        <div className="flex items-center gap-2 p-3 rounded-md border" style={{ background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}>
          <Users className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--risk-high)' }} />
          <p className="text-xs" style={{ color: 'var(--text)' }}>
            <span className="font-semibold">Cross-merchant signal:</span> seen at{' '}
            {profile.total_merchants_seen_at} merchant{profile.total_merchants_seen_at !== 1 ? 's' : ''} in the Unauth network.
          </p>
        </div>
      )}

      <div className="pt-2 flex items-center justify-between gap-3">
        {profile.total_orders > 0 && (
          <a
            href={`/customers/${profile.id}/evidence/new`}
            className="text-xs hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Generate evidence package →
          </a>
        )}
        <button
          onClick={onOpen}
          className="text-xs font-semibold hover:underline ml-auto"
          style={{ color: 'var(--text)' }}
        >
          View full profile →
        </button>
      </div>
    </div>
  );
}
