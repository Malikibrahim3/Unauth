'use client';

import { useState, useMemo } from 'react';
import CustomerProfileCard from './CustomerProfileCard';
import type { CustomerProfile } from '@/lib/analysis/customerIntelligence';

type FilterMode = 'all' | 'suspicious' | 'linked' | 'refunders';

const FILTERS: { key: FilterMode; label: string; description: string }[] = [
  { key: 'all', label: 'All customers', description: 'Every customer found in this upload, highest-risk first.' },
  { key: 'suspicious', label: 'Suspicious', description: 'Customers with at least one behaviour flag (name changes, high refunds, linked accounts).' },
  { key: 'linked', label: 'Linked accounts', description: 'Customers who used different emails but shared a delivery address or card.' },
  { key: 'refunders', label: 'High refunders', description: 'Customers who refunded more than 30% of their orders.' },
];

export default function CustomerList({ profiles }: { profiles: CustomerProfile[] }) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = profiles;

    switch (filter) {
      case 'suspicious':
        list = list.filter((p) => p.flags.length > 0);
        break;
      case 'linked':
        list = list.filter((p) => p.emails.length > 1);
        break;
      case 'refunders':
        list = list.filter((p) => p.refundRate > 0.3 && p.refundCount >= 2);
        break;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.emails.some((e) => e.includes(q)) ||
          p.names.some((n) => n.includes(q)) ||
          p.addresses.some((a) => a.toLowerCase().includes(q)) ||
          p.orders.some((o) => o.orderId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [profiles, filter, search]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-subtle)' }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={
                filter === key
                  ? { background: 'var(--bg-surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
                  : { color: 'var(--text-muted)', background: 'transparent' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--icon-muted)' }}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, order..."
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg focus:outline-none w-64"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
          />
        </div>
      </div>
      <p className="text-caption italic" style={{ color: 'var(--text-muted)' }}>
        {FILTERS.find((f) => f.key === filter)?.description}
      </p>
      </div>

      {/* Results count */}
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {profiles.length} customer{profiles.length !== 1 ? 's' : ''}
      </p>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((profile) => (
          <CustomerProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-subtle)' }}>
          No customers match this filter.
        </div>
      )}
    </div>
  );
}
