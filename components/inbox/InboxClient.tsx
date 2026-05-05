'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface InboxTransaction {
  id: string;
  order_id: string;
  match_score: number;
  risk_level: string;
  processed_at: string;
  processing_job_id: string;
  customer_profile_id?: string | null;
}

interface Props {
  initialItems: InboxTransaction[];
}

export default function InboxClient({ initialItems }: Props) {
  const [items, setItems] = useState<InboxTransaction[]>(initialItems);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function dismissItem(txId: string) {
    // Optimistic remove
    setItems((prev) => prev.filter((t) => t.id !== txId));
    try {
      await fetch(`/api/transactions/${txId}/dismiss`, { method: 'PATCH' });
    } catch {
      // Revert on error — refetch would be complex, just leave removed
    }
  }

  async function setStatusAndDismiss(tx: InboxTransaction, status: 'under_review' | 'contacted') {
    setOpenDropdown(null);
    if (!tx.customer_profile_id) {
      // No profile — just dismiss
      await dismissItem(tx.id);
      return;
    }

    setPending((p) => ({ ...p, [tx.id]: true }));
    // Optimistic remove from inbox
    setItems((prev) => prev.filter((t) => t.id !== tx.id));

    try {
      // Set investigation status on customer profile
      await fetch(`/api/customers/${tx.customer_profile_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Dismiss transaction
      await fetch(`/api/transactions/${tx.id}/dismiss`, { method: 'PATCH' });
    } catch {
      // Already removed optimistically — no revert needed for status change
    } finally {
      setPending((p) => { const n = { ...p }; delete n[tx.id]; return n; });
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg p-12 flex flex-col items-center gap-3 text-center"
        style={{ border: '1.5px dashed var(--border)' }}
      >
        <svg className="h-8 w-8" style={{ color: 'var(--icon-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.151 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
        </svg>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          You&apos;re all caught up
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No high or critical transactions need review.
        </p>
        <Link
          href="/upload"
          className="mt-2 text-sm font-medium underline underline-offset-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Upload a CSV to get started →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Order ID</th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Risk</th>
            <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Score</th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Date</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr
              key={tx.id}
              className="border-b transition-colors"
              style={{
                borderColor: 'var(--border-subtle)',
                opacity: pending[tx.id] ? 0.5 : 1,
              }}
            >
              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {tx.order_id}
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-medium"
                  style={{
                    background: tx.risk_level === 'critical' ? 'var(--risk-critical-bg)' : 'var(--risk-high-bg)',
                    color: tx.risk_level === 'critical' ? 'var(--risk-critical)' : 'var(--risk-high)',
                    borderColor: tx.risk_level === 'critical' ? 'var(--risk-critical-bd)' : 'var(--risk-high-bd)',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor' }} />
                  {tx.risk_level}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>
                {Math.round(tx.match_score)}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(tx.processed_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2" ref={openDropdown === tx.id ? dropdownRef : undefined}>
                  <Link
                    href={`/audit/${tx.processing_job_id}/transaction/${tx.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    Review →
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === tx.id ? null : tx.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors"
                      style={{
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      Set status <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === tx.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-20 rounded-md shadow-lg border overflow-hidden"
                        style={{
                          background: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          minWidth: '180px',
                        }}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'under_review')}
                        >
                          Mark as Under review
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'contacted')}
                        >
                          Mark as Contacted
                        </button>
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onClick={() => { setOpenDropdown(null); dismissItem(tx.id); }}
                        >
                          Clear from inbox
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
