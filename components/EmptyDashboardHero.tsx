import Link from 'next/link';
import { Upload, CheckCircle2 } from 'lucide-react';

export default function EmptyDashboardHero() {
  return (
    <div className="space-y-4">
      {/* Primary setup card — store + helpdesk as one required action */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="h-1 w-full" style={{ background: '#2563EB' }} />
        <div className="p-7">
          <h2 className="font-semibold mb-2" style={{ fontSize: '18px', color: 'var(--text)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            Connect your Shopify store and helpdesk
          </h2>
          <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            Unauth needs both to work. Shopify provides order data — your helpdesk provides claim history. One without the other gives you an incomplete picture you can't act on.
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-subtle)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            Gorgias and Zendesk are supported.
          </p>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2563EB', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          >
            Set up integrations
          </Link>
        </div>
      </div>

      {/* What you'll get */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>What you&apos;ll get once connected</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {[
            'Customers graded by identity confidence (definite / probable / possible)',
            'Full order and claim history per customer, across your helpdesk and store',
            'Cross-merchant signals when the same identity appears elsewhere',
            'Evidence packages for chargeback disputes, ready to export',
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--ink-tertiary)' }} />
              <span className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Secondary path — CSV */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
        style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Upload className="h-4 w-4 shrink-0" style={{ color: 'var(--text-subtle)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Not ready to connect yet?</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Upload a CSV export to explore what Unauth can surface — integrations can be added later.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/upload?welcome=1"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Upload CSV
          </Link>
          <Link
            href="/demo"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            View sample →
          </Link>
        </div>
      </div>
    </div>
  );
}
